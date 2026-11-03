
package com.graphify.graphify_system.util;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.expr.ConditionalExpr;
import com.github.javaparser.ast.stmt.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

public class CodeMetricsUtil {

    // Count non-blank, non-comment lines (simple heuristic)
    public static long countLOC(Path file) throws IOException {
        try (Stream<String> lines = Files.lines(file)) {
            return lines
                    .filter(line -> !line.trim().isEmpty())
                    .filter(line -> !line.trim().startsWith("//"))
                    .count();
        }
    }

    // Estimate cyclomatic complexity using JavaParser
    public static int computeComplexity(Path file) throws IOException {
        JavaParser parser = new JavaParser();
        ParseResult<CompilationUnit> result = parser.parse(file);

        CompilationUnit cu = result.getResult()
                .orElseThrow(() ->
                        new IOException("Unable to parse Java file: " + file));

        int complexity = 0;

        for (MethodDeclaration method :
                cu.findAll(MethodDeclaration.class)) {

            int methodComplexity = 1;

            methodComplexity += method.findAll(IfStmt.class).size();
            methodComplexity += method.findAll(ForStmt.class).size();
            methodComplexity += method.findAll(ForEachStmt.class).size();
            methodComplexity += method.findAll(WhileStmt.class).size();
            methodComplexity += method.findAll(DoStmt.class).size();
            methodComplexity += method.findAll(SwitchEntry.class).size();
            methodComplexity += method.findAll(CatchClause.class).size();
            methodComplexity += method.findAll(ConditionalExpr.class).size();

            complexity += methodComplexity;
        }

        return complexity;
    }

    // Analyze Java files recursively under the source root
    public static List<Map<String, Object>> analyzeSource(
            Path srcRoot) throws IOException {

        List<Map<String, Object>> results = new ArrayList<>();

        try (Stream<Path> stream = Files.walk(srcRoot)) {
            stream.filter(Files::isRegularFile)
                    .filter(path ->
                            path.toString().endsWith(".java"))
                    .forEach(path -> {
                        try {
                            long loc = countLOC(path);
                            int complexity = computeComplexity(path);

                            Map<String, Object> entry = new HashMap<>();
                            entry.put(
                                    "path",
                                    srcRoot.relativize(path)
                                            .toString()
                                            .replace('\\', '/'));
                            entry.put("loc", loc);
                            entry.put(
                                    "cyclomaticComplexity",
                                    complexity);

                            results.add(entry);
                        } catch (IOException e) {
                            // Skip files that cannot be read or parsed.
                        }
                    });
        }

        return results;
    }
}
