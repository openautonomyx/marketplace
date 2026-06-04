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

package org.apache.seatunnel.connectors.seatunnel.salesforce.source;

import org.apache.seatunnel.api.source.Collector;
import org.apache.seatunnel.api.source.SourceReader;
import org.apache.seatunnel.api.table.type.SeaTunnelRow;
import org.apache.seatunnel.api.table.type.SeaTunnelRowType;
import org.apache.seatunnel.connectors.seatunnel.salesforce.client.SalesforceClient;
import org.apache.seatunnel.connectors.seatunnel.salesforce.client.SalesforceQueryResult;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSourceConfig;
import org.apache.seatunnel.connectors.seatunnel.salesforce.util.SalesforceRowConverter;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;

/** Reads SOQL query results page by page and emits one {@link SeaTunnelRow} per record. */
@Slf4j
public class SalesforceSourceReader implements SourceReader<SeaTunnelRow, SalesforceSourceSplit> {

    private final SalesforceSourceConfig config;
    private final SeaTunnelRowType rowType;
    private final Context context;
    private final ConcurrentLinkedQueue<SalesforceSourceSplit> splits = new ConcurrentLinkedQueue<>();

    private SalesforceClient client;
    private volatile boolean noMoreSplits;

    public SalesforceSourceReader(
            SalesforceSourceConfig config, SeaTunnelRowType rowType, Context context) {
        this.config = config;
        this.rowType = rowType;
        this.context = context;
    }

    @Override
    public void open() {
        client = new SalesforceClient(config.connection());
        client.authenticate();
    }

    @Override
    public void close() {
        if (client != null) {
            client.close();
        }
    }

    @Override
    public void pollNext(Collector<SeaTunnelRow> output) throws InterruptedException {
        SalesforceSourceSplit split = splits.poll();
        if (split != null) {
            readSplit(split, output);
        }

        if (splits.isEmpty() && noMoreSplits) {
            log.info("Salesforce reader {} finished all splits", context.getIndexOfSubtask());
            context.signalNoMoreElement();
        } else if (split == null) {
            // Avoid a busy loop while waiting for the enumerator to assign the split.
            Thread.sleep(500L);
        }
    }

    private void readSplit(SalesforceSourceSplit split, Collector<SeaTunnelRow> output) {
        log.info("Executing SOQL for split {}", split.splitId());
        SalesforceQueryResult result = client.query(split.getQuery(), config.getQueryBatchSize());
        emit(result, output);
        while (!result.isDone() && result.getNextRecordsUrl() != null) {
            result = client.queryMore(result.getNextRecordsUrl(), config.getQueryBatchSize());
            emit(result, output);
        }
    }

    private void emit(SalesforceQueryResult result, Collector<SeaTunnelRow> output) {
        for (Map<String, Object> record : result.getRecords()) {
            output.collect(SalesforceRowConverter.toSeaTunnelRow(rowType, record));
        }
    }

    @Override
    public List<SalesforceSourceSplit> snapshotState(long checkpointId) {
        return new ArrayList<>(splits);
    }

    @Override
    public void addSplits(List<SalesforceSourceSplit> newSplits) {
        splits.addAll(newSplits);
    }

    @Override
    public void handleNoMoreSplits() {
        noMoreSplits = true;
    }
}
