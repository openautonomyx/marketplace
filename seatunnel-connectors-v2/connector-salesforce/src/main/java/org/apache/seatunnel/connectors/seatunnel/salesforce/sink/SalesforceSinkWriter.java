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

package org.apache.seatunnel.connectors.seatunnel.salesforce.sink;

import org.apache.seatunnel.api.sink.SinkWriter;
import org.apache.seatunnel.api.table.type.SeaTunnelRow;
import org.apache.seatunnel.api.table.type.SeaTunnelRowType;
import org.apache.seatunnel.connectors.seatunnel.salesforce.client.SalesforceClient;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSinkConfig;
import org.apache.seatunnel.connectors.seatunnel.salesforce.exception.SalesforceConnectorErrorCode;
import org.apache.seatunnel.connectors.seatunnel.salesforce.exception.SalesforceConnectorException;
import org.apache.seatunnel.connectors.seatunnel.salesforce.util.SalesforceRowConverter;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Buffers rows and flushes them to Salesforce in composite batches. */
@Slf4j
public class SalesforceSinkWriter implements SinkWriter<SeaTunnelRow, Void, Void> {

    private final SalesforceSinkConfig config;
    private final SeaTunnelRowType rowType;
    private final SalesforceClient client;
    private final List<Map<String, Object>> buffer = new ArrayList<>();

    public SalesforceSinkWriter(SalesforceSinkConfig config, SeaTunnelRowType rowType) {
        this.config = config;
        this.rowType = rowType;
        this.client = new SalesforceClient(config.connection());
        this.client.authenticate();
    }

    @Override
    public void write(SeaTunnelRow element) {
        buffer.add(SalesforceRowConverter.toSalesforceRecord(rowType, element));
        if (buffer.size() >= config.getMaxBatchSize()) {
            flush();
        }
    }

    private void flush() {
        if (buffer.isEmpty()) {
            return;
        }
        List<Boolean> results = client.insert(config.getObject(), buffer, config.isAllOrNone());
        long failed = results.stream().filter(success -> !success).count();
        if (failed > 0) {
            throw new SalesforceConnectorException(
                    SalesforceConnectorErrorCode.WRITE_FAILED,
                    failed + " of " + buffer.size() + " records were rejected by Salesforce");
        }
        log.debug("Flushed {} records to Salesforce object {}", buffer.size(), config.getObject());
        buffer.clear();
    }

    @Override
    public java.util.Optional<Void> prepareCommit() {
        flush();
        return java.util.Optional.empty();
    }

    @Override
    public void abortPrepare() {
        // The composite API is the unit of work; nothing buffered survives a failed flush.
        buffer.clear();
    }

    @Override
    public void close() {
        flush();
        client.close();
    }
}
