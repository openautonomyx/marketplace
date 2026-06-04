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

import org.apache.seatunnel.api.sink.SeaTunnelSink;
import org.apache.seatunnel.api.sink.SinkWriter;
import org.apache.seatunnel.api.sink.SupportMultiTableSink;
import org.apache.seatunnel.api.table.catalog.CatalogTable;
import org.apache.seatunnel.api.table.type.SeaTunnelRow;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSinkConfig;

import java.io.IOException;
import java.util.Optional;

/** The Salesforce sink. Writes rows to a single sObject using the composite collections API. */
public class SalesforceSink
        implements SeaTunnelSink<SeaTunnelRow, Void, Void, Void>, SupportMultiTableSink {

    private static final long serialVersionUID = 1L;

    private final SalesforceSinkConfig config;
    private final CatalogTable catalogTable;

    public SalesforceSink(SalesforceSinkConfig config, CatalogTable catalogTable) {
        this.config = config;
        this.catalogTable = catalogTable;
    }

    @Override
    public String getPluginName() {
        return "Salesforce";
    }

    @Override
    public SinkWriter<SeaTunnelRow, Void, Void> createWriter(SinkWriter.Context context)
            throws IOException {
        return new SalesforceSinkWriter(config, catalogTable.getSeaTunnelRowType());
    }

    @Override
    public Optional<CatalogTable> getWriteCatalogTable() {
        return Optional.of(catalogTable);
    }
}
