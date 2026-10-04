package com.hackathon.CollaborativeProjectWorkspace.repository;

import com.hackathon.CollaborativeProjectWorkspace.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByProject_ProjectIdOrderByCreatedAtDesc(Long projectId);
}
