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

import org.apache.seatunnel.api.source.SourceSplitEnumerator;
import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceSourceConfig;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * The SOQL source produces a single split (the configured query). The enumerator hands that split
 * to the first registered reader and then signals "no more splits" to every reader.
 */
@Slf4j
public class SalesforceSourceSplitEnumerator
        implements SourceSplitEnumerator<SalesforceSourceSplit, SalesforceSourceState> {

    private static final String SINGLE_SPLIT_ID = "salesforce-soql-split-0";

    private final SalesforceSourceConfig config;
    private final Context<SalesforceSourceSplit> context;
    private final ConcurrentLinkedQueue<SalesforceSourceSplit> pendingSplits =
            new ConcurrentLinkedQueue<>();
    private volatile boolean assigned;

    public SalesforceSourceSplitEnumerator(
            SalesforceSourceConfig config, Context<SalesforceSourceSplit> context) {
        this(config, context, null);
    }

    public SalesforceSourceSplitEnumerator(
            SalesforceSourceConfig config,
            Context<SalesforceSourceSplit> context,
            SalesforceSourceState restoredState) {
        this.config = config;
        this.context = context;
        if (restoredState != null) {
            this.assigned = restoredState.isAssigned();
            this.pendingSplits.addAll(restoredState.getPendingSplits());
        }
    }

    @Override
    public void open() {
        if (!assigned && pendingSplits.isEmpty()) {
            pendingSplits.add(new SalesforceSourceSplit(SINGLE_SPLIT_ID, config.getQuery()));
        }
    }

    @Override
    public void run() {
        assignPendingSplits();
    }

    @Override
    public void addSplitsBack(List<SalesforceSourceSplit> splits, int subtaskId) {
        if (splits != null && !splits.isEmpty()) {
            pendingSplits.addAll(splits);
            assigned = false;
        }
    }

    @Override
    public int currentUnassignedSplitsSize() {
        return pendingSplits.size();
    }

    @Override
    public void handleSplitRequest(int subtaskId) {
        assignPendingSplits();
    }

    @Override
    public void registerReader(int subtaskId) {
        assignPendingSplits();
    }

    private synchronized void assignPendingSplits() {
        if (context.registeredReaders().isEmpty()) {
            return;
        }
        if (!pendingSplits.isEmpty()) {
            int target = Collections.min(context.registeredReaders());
            List<SalesforceSourceSplit> toAssign = new ArrayList<>(pendingSplits);
            pendingSplits.clear();
            log.info("Assigning {} Salesforce split(s) to reader {}", toAssign.size(), target);
            context.assignSplit(target, toAssign);
            assigned = true;
        }
        // Every reader is bounded; once the splits are placed, tell all readers we are done.
        for (int reader : context.registeredReaders()) {
            context.signalNoMoreSplits(reader);
        }
    }

    @Override
    public SalesforceSourceState snapshotState(long checkpointId) {
        return new SalesforceSourceState(new ArrayList<>(pendingSplits), assigned);
    }

    @Override
    public void notifyCheckpointComplete(long checkpointId) {
        // no-op: nothing to commit on the enumerator side.
    }

    @Override
    public void close() {
        pendingSplits.clear();
    }
}
