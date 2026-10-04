package com.hackathon.CollaborativeProjectWorkspace.repository;

import com.hackathon.CollaborativeProjectWorkspace.entity.Tasks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TasksRepository extends JpaRepository<Tasks, Long>, JpaSpecificationExecutor<Tasks> {
    Optional<Tasks> findByIdAndProject_ProjectId(Long taskId, Long projectId);

    List<Tasks> findByProject_ProjectId(Long projectId);

    @Query("SELECT t FROM Tasks t LEFT JOIN FETCH t.assignee WHERE t.project.projectId = :projectId")
    List<Tasks> findByProjectIdWithAssignee(@Param("projectId") Long projectId);
}
