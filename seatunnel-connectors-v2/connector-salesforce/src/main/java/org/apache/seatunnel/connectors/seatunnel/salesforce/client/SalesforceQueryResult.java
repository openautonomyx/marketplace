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

package org.apache.seatunnel.connectors.seatunnel.salesforce.client;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;
import java.util.Map;

/** One page of a SOQL query response. */
@Getter
@AllArgsConstructor
public class SalesforceQueryResult {

    /** The records contained in this page; each record is a field-name to value map. */
    private final List<Map<String, Object>> records;

    /**
     * The relative URL used to fetch the next page (e.g. {@code /services/data/v59.0/query/01gxx0}),
     * or {@code null} when {@link #done} is {@code true}.
     */
    private final String nextRecordsUrl;

    /** Whether the query has returned every matching record. */
    private final boolean done;
}
