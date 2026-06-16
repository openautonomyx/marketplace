/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.seatunnel.connectors.seatunnel.salesforce.util;

import org.apache.seatunnel.api.table.type.SeaTunnelDataType;
import org.apache.seatunnel.api.table.type.SeaTunnelRow;
import org.apache.seatunnel.api.table.type.SeaTunnelRowType;
import org.apache.seatunnel.api.table.type.SqlType;
import org.apache.seatunnel.connectors.seatunnel.salesforce.exception.SalesforceConnectorErrorCode;
import org.apache.seatunnel.connectors.seatunnel.salesforce.exception.SalesforceConnectorException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/** Converts between Salesforce JSON records and {@link SeaTunnelRow}. */
public final class SalesforceRowConverter {

    private SalesforceRowConverter() {}

    /** Build a {@link SeaTunnelRow} from a Salesforce record according to the row type. */
    public static SeaTunnelRow toSeaTunnelRow(
            SeaTunnelRowType rowType, Map<String, Object> record) {
        Object[] fields = new Object[rowType.getTotalFields()];
        String[] fieldNames = rowType.getFieldNames();
        for (int i = 0; i < fieldNames.length; i++) {
            Object raw = record.get(fieldNames[i]);
            fields[i] = convert(fieldNames[i], rowType.getFieldType(i), raw);
        }
        return new SeaTunnelRow(fields);
    }

    /** Build a Salesforce field map (column name -> value) from a {@link SeaTunnelRow}. */
    public static Map<String, Object> toSalesforceRecord(
            SeaTunnelRowType rowType, SeaTunnelRow row) {
        Map<String, Object> record = new LinkedHashMap<>();
        String[] fieldNames = rowType.getFieldNames();
        for (int i = 0; i < fieldNames.length; i++) {
            Object value = row.getField(i);
            if (value != null) {
                // Salesforce reserves Id; it cannot be supplied on insert.
                if ("Id".equalsIgnoreCase(fieldNames[i])) {
                    continue;
                }
                record.put(fieldNames[i], stringifyTemporal(value));
            }
        }
        return record;
    }

    private static Object convert(String field, SeaTunnelDataType<?> type, Object raw) {
        if (raw == null) {
            return null;
        }
        SqlType sqlType = type.getSqlType();
        try {
            switch (sqlType) {
                case STRING:
                    return String.valueOf(raw);
                case BOOLEAN:
                    return raw instanceof Boolean ? raw : Boolean.parseBoolean(String.valueOf(raw));
                case TINYINT:
                    return Byte.parseByte(String.valueOf(raw));
                case SMALLINT:
                    return Short.parseShort(String.valueOf(raw));
                case INT:
                    return (int) Double.parseDouble(String.valueOf(raw));
                case BIGINT:
                    // Go through BigDecimal, not double: doubles lose precision above
                    // 2^53, corrupting integral Number(18,0) values. longValueExact
                    // also rejects fractional/overflowing inputs instead of truncating.
                    return new BigDecimal(String.valueOf(raw)).longValueExact();
                case FLOAT:
                    return Float.parseFloat(String.valueOf(raw));
                case DOUBLE:
                    return Double.parseDouble(String.valueOf(raw));
                case DECIMAL:
                    return new BigDecimal(String.valueOf(raw));
                case DATE:
                    return LocalDate.parse(asDateString(raw), DateTimeFormatter.ISO_LOCAL_DATE);
                case TIMESTAMP:
                    return parseTimestamp(String.valueOf(raw));
                default:
                    throw new SalesforceConnectorException(
                            SalesforceConnectorErrorCode.FIELD_CONVERT_FAILED,
                            "Unsupported type " + sqlType + " for field " + field);
            }
        } catch (SalesforceConnectorException e) {
            throw e;
        } catch (Exception e) {
            throw new SalesforceConnectorException(
                    SalesforceConnectorErrorCode.FIELD_CONVERT_FAILED,
                    "Field '" + field + "' value '" + raw + "' is not a valid " + sqlType,
                    e);
        }
    }

    private static String asDateString(Object raw) {
        String value = String.valueOf(raw);
        // Salesforce date-time fields may carry a time component; keep the date part only.
        int t = value.indexOf('T');
        return t > 0 ? value.substring(0, t) : value;
    }

    private static LocalDateTime parseTimestamp(String value) {
        // Salesforce returns ISO-8601 with an offset, e.g. 2026-06-04T10:15:30.000+0000.
        String normalized = value;
        if (normalized.matches(".*[+-]\\d{4}$")) {
            normalized =
                    normalized.substring(0, normalized.length() - 2)
                            + ":"
                            + normalized.substring(normalized.length() - 2);
        }
        try {
            return OffsetDateTime.parse(normalized).toLocalDateTime();
        } catch (Exception e) {
            return LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
    }

    private static Object stringifyTemporal(Object value) {
        if (value instanceof LocalDate) {
            return ((LocalDate) value).format(DateTimeFormatter.ISO_LOCAL_DATE);
        }
        if (value instanceof LocalDateTime) {
            return ((LocalDateTime) value).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
        return value;
    }
}
