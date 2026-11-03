package com.graphify.graphify_system.controller;

import com.graphify.graphify_system.util.DependencyUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dependencies")
public class DependencyController {

    private final Path repoRoot = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
    private final Path pomPath = repoRoot.resolve("pom.xml");
    private final Path packageJsonPath = repoRoot.resolve("frontend/graphify-ui/package.json");

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllDependencies() {
        try {
            List<Map<String, String>> mavenDeps = DependencyUtil.parseMavenDependencies(pomPath);
            List<Map<String, String>> npmDeps = DependencyUtil.parseNpmDependencies(packageJsonPath);
            Map<String, Object> result = new HashMap<>();
            result.put("maven", mavenDeps);
            result.put("npm", npmDeps);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(null);
        }
    }
}

