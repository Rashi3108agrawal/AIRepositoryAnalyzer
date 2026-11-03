package com.graphify.graphify_system.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

@RestController
@RequestMapping("/code-graph")
@CrossOrigin(origins = "*")
public class CodeGraphController {

    @GetMapping
    public ResponseEntity<String> getCodeGraph() {
        File graphFile = new File(".graphify/graph.json");
        if (graphFile.exists()) {
            try {
                String content = Files.readString(graphFile.toPath());
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(content);
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("{\"error\":\"Failed to read code graph: " + e.getMessage() + "\"}");
            }
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":\"Code graph not found. Run 'node cli/bin/graphify-code.js scan' first.\"}");
    }
}
