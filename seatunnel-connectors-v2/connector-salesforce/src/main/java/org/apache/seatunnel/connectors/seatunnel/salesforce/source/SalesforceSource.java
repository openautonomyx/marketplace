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

import org.apache.seatunnel.api.source.Boundedness;
import org.apache.seatunnel.api.source.SeaTunnelSource;
import org.apache.seatunnel.api.source.SourceReader;
import org.apache.seatunnel.api.source.SourceSplitEnumerator;
import org.apache.seatunnel.api.source.SupportColumnProjection;
import org.apache.seatunnel.api.source.SupportParallelism;
import org.apache.seatunnel.api.table.catalog.CatalogTable;
import org.apache.seatunnel.api.table.type.SeaTunnelRow;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSourceConfig;

import java.util.Collections;
import java.util.List;

/** The Salesforce SOQL source. Bounded: it reads the full result set of the configured query. */
public class SalesforceSource
        implements SeaTunnelSource<SeaTunnelRow, SalesforceSourceSplit, SalesforceSourceState>,
                SupportParallelism,
                SupportColumnProjection {

    private static final long serialVersionUID = 1L;

    private final SalesforceSourceConfig config;
    private final CatalogTable catalogTable;

    public SalesforceSource(SalesforceSourceConfig config, CatalogTable catalogTable) {
        this.config = config;
        this.catalogTable = catalogTable;
    }

    @Override
    public String getPluginName() {
        return "Salesforce";
    }

    @Override
    public Boundedness getBoundedness() {
        return Boundedness.BOUNDED;
    }

    @Override
    public List<CatalogTable> getProducedCatalogTables() {
        return Collections.singletonList(catalogTable);
    }

    @Override
    public SourceReader<SeaTunnelRow, SalesforceSourceSplit> createReader(
            SourceReader.Context readerContext) {
        return new SalesforceSourceReader(
                config, catalogTable.getSeaTunnelRowType(), readerContext);
    }

    @Override
    public SourceSplitEnumerator<SalesforceSourceSplit, SalesforceSourceState> createEnumerator(
            SourceSplitEnumerator.Context<SalesforceSourceSplit> enumeratorContext) {
        return new SalesforceSourceSplitEnumerator(config, enumeratorContext);
    }

    @Override
    public SourceSplitEnumerator<SalesforceSourceSplit, SalesforceSourceState> restoreEnumerator(
            SourceSplitEnumerator.Context<SalesforceSourceSplit> enumeratorContext,
            SalesforceSourceState checkpointState) {
        return new SalesforceSourceSplitEnumerator(config, enumeratorContext, checkpointState);
    }
}
