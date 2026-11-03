package com.graphify.graphify_system.controller;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.BlameCommand;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.blame.BlameResult;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/git")
public class GitController {

    private final Path repoRoot = Paths.get(System.getProperty("user.dir")).toAbsolutePath();

    private Repository openRepository() throws IOException {
        File gitDir = repoRoot.resolve(".git").toFile();
        return new FileRepositoryBuilder()
                .setGitDir(gitDir)
                .readEnvironment()
                .findGitDir()
                .build();
    }

    // List recent commits (last 20) optionally filtered by file path
    
@GetMapping("/commits")
public ResponseEntity<List<Map<String, Object>>> listCommits(
        @RequestParam(required = false) String path) {
    try (Repository repository = openRepository();
         Git git = new Git(repository)) {

        var log = git.log();

        if (path != null && !path.isEmpty()) {
            log.addPath(path);
        }

        List<Map<String, Object>> commits = new ArrayList<>();

        for (var rev : log.setMaxCount(20).call()) {
            PersonIdent author = rev.getAuthorIdent();

            Map<String, Object> entry = new HashMap<>();
            entry.put("hash", rev.getName());
            entry.put("shortHash", rev.getName().substring(0, 7));
            entry.put("message", rev.getShortMessage());
            entry.put("author", author.getName());
            entry.put("email", author.getEmailAddress());
            entry.put("date", author.getWhen().toInstant().toString());

            commits.add(entry);
        }

        return ResponseEntity.ok(commits);

    } catch (IOException | GitAPIException e) {
        return ResponseEntity.status(500).body(null);
    }
}

    // Blame for a given file path (relative to repo root)
    @GetMapping("/blame")
    public ResponseEntity<List<Map<String, Object>>> blameFile(@RequestParam String path) {
        try (Repository repository = openRepository(); Git git = new Git(repository)) {
            Path target = repoRoot.resolve(path).normalize();
            if (!target.startsWith(repoRoot) || !target.toFile().exists()) {
                return ResponseEntity.badRequest().body(null);
            }
            BlameCommand blameCmd = git.blame();
            blameCmd.setFilePath(repoRoot.relativize(target).toString().replace('\\', '/'));
            BlameResult result = blameCmd.call();
            List<Map<String, Object>> lines = new ArrayList<>();
            int lineCount = result.getResultContents().size();
            for (int i = 0; i < lineCount; i++) {
                PersonIdent author = result.getSourceAuthor(i);
                Map<String, Object> lineInfo = new HashMap<>();
                lineInfo.put("line", i + 1);
                lineInfo.put("author", author.getName());
                lineInfo.put("email", author.getEmailAddress());
                lineInfo.put("commit", result.getSourceCommit(i).getName().substring(0,7));
                lines.add(lineInfo);
            }
            return ResponseEntity.ok(lines);
        } catch (IOException | GitAPIException e) {
            return ResponseEntity.status(500).body(null);
        }
    }
}
