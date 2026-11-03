package com.graphify.graphify_system.util;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DependencyUtil {

    private static final ObjectMapper mapper = new ObjectMapper();

    // Parse Maven pom.xml dependencies
    public static List<Map<String, String>> parseMavenDependencies(Path pomPath) throws Exception {
        List<Map<String, String>> deps = new ArrayList<>();
        DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
        DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();
        Document doc = dBuilder.parse(pomPath.toFile());
        doc.getDocumentElement().normalize();
        NodeList depNodes = doc.getElementsByTagName("dependency");
        for (int i = 0; i < depNodes.getLength(); i++) {
            var depNode = depNodes.item(i);
            var elem = depNode.getChildNodes();
            String groupId = null, artifactId = null, version = null;
            for (int j = 0; j < elem.getLength(); j++) {
                var child = elem.item(j);
                if ("groupId".equals(child.getNodeName())) groupId = child.getTextContent();
                if ("artifactId".equals(child.getNodeName())) artifactId = child.getTextContent();
                if ("version".equals(child.getNodeName())) version = child.getTextContent();
            }
            if (groupId != null && artifactId != null) {
                Map<String, String> map = new HashMap<>();
                map.put("groupId", groupId);
                map.put("artifactId", artifactId);
                map.put("version", version != null ? version : "");
                deps.add(map);
            }
        }
        return deps;
    }

    // Parse npm package.json dependencies
    public static List<Map<String, String>> parseNpmDependencies(Path packageJsonPath) throws IOException {
        List<Map<String, String>> deps = new ArrayList<>();
        JsonNode root = mapper.readTree(Files.readString(packageJsonPath));
        JsonNode depNode = root.path("dependencies");
        if (depNode.isObject()) {
            depNode.fields().forEachRemaining(entry -> {
                Map<String, String> map = new HashMap<>();
                map.put("name", entry.getKey());
                map.put("version", entry.getValue().asText());
                deps.add(map);
            });
        }
        return deps;
    }
}

