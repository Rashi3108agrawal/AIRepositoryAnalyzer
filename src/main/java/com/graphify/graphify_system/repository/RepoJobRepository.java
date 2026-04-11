package com.graphify.graphify_system.repository;


import com.graphify.graphify_system.model.RepoJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RepoJobRepository extends JpaRepository<RepoJob, Long> {
}
