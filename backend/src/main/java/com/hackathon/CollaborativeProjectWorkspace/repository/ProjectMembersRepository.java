package com.hackathon.CollaborativeProjectWorkspace.repository;

import com.hackathon.CollaborativeProjectWorkspace.entity.ProjectMembers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectMembersRepository extends JpaRepository<ProjectMembers, Long> {
    Optional<ProjectMembers> findByProject_ProjectIdAndUser_UserId(Long projectId, Long userId);

    boolean existsByProject_ProjectIdAndUser_UserId(Long projectId, Long userId);

    List<ProjectMembers> findByProject_ProjectId(Long projectId);

    @Query("SELECT pm FROM ProjectMembers pm JOIN FETCH pm.user WHERE pm.project.projectId = :projectId")
    List<ProjectMembers> findMembersWithUserByProjectId(@Param("projectId") Long projectId);
}
