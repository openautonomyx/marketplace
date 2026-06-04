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

import org.apache.seatunnel.connectors.seatunnel.salesforce.config.SalesforceConnectionConfig;
import org.apache.seatunnel.connectors.seatunnel.salesforce.exception.SalesforceConnectorErrorCode;
import org.apache.seatunnel.connectors.seatunnel.salesforce.exception.SalesforceConnectorException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * A thin Salesforce REST client built on {@link HttpURLConnection} so the connector carries no
 * heavyweight HTTP dependency. It supports the OAuth 2.0 username-password flow, paginated SOQL
 * reads and composite sObject writes.
 */
@Slf4j
public class SalesforceClient implements Closeable {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final SalesforceConnectionConfig config;

    private String accessToken;
    private String instanceUrl;

    public SalesforceClient(SalesforceConnectionConfig config) {
        this.config = config;
    }

    /** Authenticate via the OAuth 2.0 username-password flow and cache the token + instance url. */
    public void authenticate() {
        String tokenEndpoint = trimTrailingSlash(config.getUrl()) + "/services/oauth2/token";
        String passwordWithToken =
                config.getSecurityToken() == null || config.getSecurityToken().isEmpty()
                        ? config.getPassword()
                        : config.getPassword() + config.getSecurityToken();

        String form =
                "grant_type=password"
                        + "&client_id=" + encode(config.getClientId())
                        + "&client_secret=" + encode(config.getClientSecret())
                        + "&username=" + encode(config.getUsername())
                        + "&password=" + encode(passwordWithToken);

        try {
            HttpURLConnection conn = open(tokenEndpoint, "POST", false);
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            writeBody(conn, form);

            JsonNode body = readJson(conn, SalesforceConnectorErrorCode.AUTH_FAILED);
            this.accessToken = requiredText(body, "access_token", SalesforceConnectorErrorCode.AUTH_FAILED);
            this.instanceUrl = requiredText(body, "instance_url", SalesforceConnectorErrorCode.AUTH_FAILED);
            log.info("Authenticated with Salesforce instance {}", instanceUrl);
        } catch (SalesforceConnectorException e) {
            throw e;
        } catch (Exception e) {
            throw new SalesforceConnectorException(SalesforceConnectorErrorCode.AUTH_FAILED, e);
        }
    }

    /** Run the initial SOQL query and return its first page. */
    public SalesforceQueryResult query(String soql, int batchSize) {
        ensureAuthenticated();
        String path =
                "/services/data/v" + config.getApiVersion() + "/query?q=" + encode(soql);
        return executeQuery(instanceUrl + path, batchSize);
    }

    /** Fetch the next page of an in-flight query using the relative {@code nextRecordsUrl}. */
    public SalesforceQueryResult queryMore(String nextRecordsUrl, int batchSize) {
        ensureAuthenticated();
        return executeQuery(instanceUrl + nextRecordsUrl, batchSize);
    }

    private SalesforceQueryResult executeQuery(String fullUrl, int batchSize) {
        try {
            HttpURLConnection conn = open(fullUrl, "GET", true);
            if (batchSize > 0) {
                conn.setRequestProperty("Sforce-Query-Options", "batchSize=" + batchSize);
            }
            JsonNode body = readJson(conn, SalesforceConnectorErrorCode.QUERY_FAILED);

            List<Map<String, Object>> records = new ArrayList<>();
            JsonNode recordsNode = body.get("records");
            if (recordsNode != null && recordsNode.isArray()) {
                for (JsonNode record : recordsNode) {
                    records.add(toRecordMap((ObjectNode) record));
                }
            }
            boolean done = body.path("done").asBoolean(true);
            String nextUrl = body.hasNonNull("nextRecordsUrl") ? body.get("nextRecordsUrl").asText() : null;
            return new SalesforceQueryResult(records, nextUrl, done);
        } catch (SalesforceConnectorException e) {
            throw e;
        } catch (Exception e) {
            throw new SalesforceConnectorException(SalesforceConnectorErrorCode.QUERY_FAILED, e);
        }
    }

    /**
     * Insert a batch of records into the given sObject via the composite sObjects collection API.
     * Returns the per-record results in the same order as the input.
     */
    public List<Boolean> insert(String object, List<Map<String, Object>> records, boolean allOrNone) {
        ensureAuthenticated();
        if (records.isEmpty()) {
            return new ArrayList<>();
        }
        String url = instanceUrl + "/services/data/v" + config.getApiVersion() + "/composite/sobjects";
        try {
            ObjectNode payload = MAPPER.createObjectNode();
            payload.put("allOrNone", allOrNone);
            ArrayNode recordsNode = payload.putArray("records");
            for (Map<String, Object> record : records) {
                ObjectNode node = MAPPER.valueToTree(record);
                ObjectNode attributes = node.putObject("attributes");
                attributes.put("type", object);
                recordsNode.add(node);
            }

            HttpURLConnection conn = open(url, "POST", true);
            conn.setRequestProperty("Content-Type", "application/json");
            writeBody(conn, MAPPER.writeValueAsString(payload));

            JsonNode body = readJson(conn, SalesforceConnectorErrorCode.WRITE_FAILED);
            List<Boolean> results = new ArrayList<>();
            if (body.isArray()) {
                for (JsonNode result : body) {
                    boolean success = result.path("success").asBoolean(false);
                    if (!success) {
                        log.warn("Salesforce rejected a record: {}", result.path("errors"));
                    }
                    results.add(success);
                }
            }
            return results;
        } catch (SalesforceConnectorException e) {
            throw e;
        } catch (Exception e) {
            throw new SalesforceConnectorException(SalesforceConnectorErrorCode.WRITE_FAILED, e);
        }
    }

    private void ensureAuthenticated() {
        if (accessToken == null) {
            authenticate();
        }
    }

    private HttpURLConnection open(String url, String method, boolean authorized) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod(method);
        conn.setConnectTimeout(config.getConnectTimeoutMs());
        conn.setReadTimeout(config.getReadTimeoutMs());
        conn.setRequestProperty("Accept", "application/json");
        if (authorized) {
            conn.setRequestProperty("Authorization", "Bearer " + accessToken);
        }
        if ("POST".equals(method) || "PATCH".equals(method) || "PUT".equals(method)) {
            conn.setDoOutput(true);
        }
        return conn;
    }

    private void writeBody(HttpURLConnection conn, String body) throws IOException {
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
        }
    }

    private JsonNode readJson(HttpURLConnection conn, SalesforceConnectorErrorCode errorCode)
            throws IOException {
        int status = conn.getResponseCode();
        InputStream stream = status >= 200 && status < 300 ? conn.getInputStream() : conn.getErrorStream();
        String payload = stream == null ? "" : readAll(stream);
        if (status < 200 || status >= 300) {
            throw new SalesforceConnectorException(
                    errorCode, "HTTP " + status + " from Salesforce: " + payload);
        }
        return MAPPER.readTree(payload);
    }

    private static Map<String, Object> toRecordMap(ObjectNode record) {
        Map<String, Object> map =
                MAPPER.convertValue(record, MAPPER.getTypeFactory()
                        .constructMapType(java.util.LinkedHashMap.class, String.class, Object.class));
        // The "attributes" envelope is Salesforce metadata, not a queryable field.
        map.remove("attributes");
        return map;
    }

    private static String readAll(InputStream stream) throws IOException {
        try (BufferedReader reader =
                new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    private static String requiredText(JsonNode node, String field, SalesforceConnectorErrorCode code) {
        if (node == null || !node.hasNonNull(field)) {
            throw new SalesforceConnectorException(code, "Missing field '" + field + "' in response");
        }
        return node.get(field).asText();
    }

    private static String encode(String value) {
        try {
            return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8.name());
        } catch (IOException e) {
            throw new SalesforceConnectorException(SalesforceConnectorErrorCode.HTTP_FAILED, e);
        }
    }

    private static String trimTrailingSlash(String url) {
        return url != null && url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    @Override
    public void close() {
        // HttpURLConnection has no persistent state to release; tokens are short lived.
        this.accessToken = null;
        this.instanceUrl = null;
    }

    /** Visible for tests: iterate the field names of a parsed record. */
    static List<String> fieldNames(ObjectNode node) {
        List<String> names = new ArrayList<>();
        Iterator<String> it = node.fieldNames();
        while (it.hasNext()) {
            names.add(it.next());
        }
        return names;
    }
}
