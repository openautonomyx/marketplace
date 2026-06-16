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

import org.apache.seatunnel.api.table.type.BasicType;
import org.apache.seatunnel.api.table.type.LocalTimeType;
import org.apache.seatunnel.api.table.type.SeaTunnelDataType;
import org.apache.seatunnel.api.table.type.SeaTunnelRow;
import org.apache.seatunnel.api.table.type.SeaTunnelRowType;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

class SalesforceRowConverterTest {

    private static final SeaTunnelRowType ROW_TYPE =
            new SeaTunnelRowType(
                    new String[] {"Id", "Name", "AnnualRevenue", "NumberOfEmployees", "IsActive",
                            "CreatedDate", "FoundedOn"},
                    new SeaTunnelDataType<?>[] {
                        BasicType.STRING_TYPE,
                        BasicType.STRING_TYPE,
                        BasicType.DOUBLE_TYPE,
                        BasicType.INT_TYPE,
                        BasicType.BOOLEAN_TYPE,
                        LocalTimeType.LOCAL_DATE_TIME_TYPE,
                        LocalTimeType.LOCAL_DATE_TYPE
                    });

    @Test
    void convertsSalesforceRecordToRow() {
        Map<String, Object> record = new HashMap<>();
        record.put("Id", "001xx000003DGb1AAG");
        record.put("Name", "Acme Corp");
        record.put("AnnualRevenue", 1250000.0);
        record.put("NumberOfEmployees", 240);
        record.put("IsActive", true);
        record.put("CreatedDate", "2026-06-04T10:15:30.000+0000");
        record.put("FoundedOn", "1998-04-01");

        SeaTunnelRow row = SalesforceRowConverter.toSeaTunnelRow(ROW_TYPE, record);

        Assertions.assertEquals("001xx000003DGb1AAG", row.getField(0));
        Assertions.assertEquals("Acme Corp", row.getField(1));
        Assertions.assertEquals(1250000.0, row.getField(2));
        Assertions.assertEquals(240, row.getField(3));
        Assertions.assertEquals(true, row.getField(4));
        Assertions.assertEquals(LocalDateTime.of(2026, 6, 4, 10, 15, 30), row.getField(5));
        Assertions.assertEquals(LocalDate.of(1998, 4, 1), row.getField(6));
    }

    @Test
    void nullFieldsAreTolerated() {
        Map<String, Object> record = new HashMap<>();
        record.put("Id", "001xx000003DGb2AAG");
        record.put("Name", null);

        SeaTunnelRow row = SalesforceRowConverter.toSeaTunnelRow(ROW_TYPE, record);

        Assertions.assertEquals("001xx000003DGb2AAG", row.getField(0));
        Assertions.assertNull(row.getField(1));
        Assertions.assertNull(row.getField(2));
    }

    @Test
    void dropsIdWhenBuildingInsertRecord() {
        SeaTunnelRow row =
                new SeaTunnelRow(
                        new Object[] {
                            "001xx000003DGb1AAG", "Acme Corp", 1250000.0, 240, true,
                            LocalDateTime.of(2026, 6, 4, 10, 15, 30), LocalDate.of(1998, 4, 1)
                        });

        Map<String, Object> record = SalesforceRowConverter.toSalesforceRecord(ROW_TYPE, row);

        Assertions.assertFalse(record.containsKey("Id"), "Id must not be sent on insert");
        Assertions.assertEquals("Acme Corp", record.get("Name"));
        Assertions.assertEquals("1998-04-01", record.get("FoundedOn"));
        Assertions.assertEquals("2026-06-04T10:15:30", record.get("CreatedDate"));
    }
}
