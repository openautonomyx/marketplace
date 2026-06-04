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

package org.apache.seatunnel.connectors.seatunnel.salesforce.config;

import org.apache.seatunnel.api.configuration.ReadonlyConfig;

import lombok.Getter;
import lombok.ToString;

import java.io.Serializable;

/** Immutable, serializable view of the source configuration used by the source operators. */
@Getter
@ToString(exclude = {"clientSecret", "password", "securityToken"})
public class SalesforceSourceConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String url;
    private final String clientId;
    private final String clientSecret;
    private final String username;
    private final String password;
    private final String securityToken;
    private final String apiVersion;
    private final int connectTimeoutMs;
    private final int readTimeoutMs;

    private final String query;
    private final int queryBatchSize;

    public SalesforceSourceConfig(ReadonlyConfig config) {
        this.url = config.get(SalesforceBaseOptions.URL);
        this.clientId = config.get(SalesforceBaseOptions.CLIENT_ID);
        this.clientSecret = config.get(SalesforceBaseOptions.CLIENT_SECRET);
        this.username = config.get(SalesforceBaseOptions.USERNAME);
        this.password = config.get(SalesforceBaseOptions.PASSWORD);
        this.securityToken = config.get(SalesforceBaseOptions.SECURITY_TOKEN);
        this.apiVersion = config.get(SalesforceBaseOptions.API_VERSION);
        this.connectTimeoutMs = config.get(SalesforceBaseOptions.CONNECT_TIMEOUT_MS);
        this.readTimeoutMs = config.get(SalesforceBaseOptions.READ_TIMEOUT_MS);
        this.query = config.get(SalesforceSourceOptions.QUERY);
        this.queryBatchSize = config.get(SalesforceSourceOptions.QUERY_BATCH_SIZE);
    }

    public SalesforceConnectionConfig connection() {
        return new SalesforceConnectionConfig(
                url,
                clientId,
                clientSecret,
                username,
                password,
                securityToken,
                apiVersion,
                connectTimeoutMs,
                readTimeoutMs);
    }
}
