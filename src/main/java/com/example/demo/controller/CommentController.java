package com.example.demo.controller;

import com.example.demo.config.ProjectAuthorization;
import com.example.demo.controller.dto.CommentDto;
import com.example.demo.controller.dto.CreateCommentDto;
import com.example.demo.model.Comment;
import com.example.demo.model.ProjectRole;
import com.example.demo.repository.CommentRepository;
import com.example.demo.repository.PostRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/projects/{projectId}/post/{postId}/comments")
public class CommentController {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ProjectAuthorization authorization;

    public CommentController(CommentRepository commentRepository,
                             PostRepository postRepository,
                             UserRepository userRepository,
                             ProjectAuthorization authorization) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.userRepository = userRepository;
        this.authorization = authorization;
    }

    @GetMapping
    public ResponseEntity<List<CommentDto>> list(@PathVariable UUID projectId,
                                                  @PathVariable Long postId,
                                                  JwtAuthenticationToken token) {
        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!post.getProject().getProjectId().equals(projectId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var comments = commentRepository.findAllByPost_PostIdOrderByCreationTimestampAsc(postId)
                .stream()
                .map(c -> new CommentDto(c.getCommentId(), c.getContent(), c.getUser().getUsername(), c.getCreationTimestamp()))
                .toList();

        return ResponseEntity.ok(comments);
    }

    @PostMapping
    public ResponseEntity<CommentDto> create(@PathVariable UUID projectId,
                                              @PathVariable Long postId,
                                              @RequestBody CreateCommentDto dto,
                                              JwtAuthenticationToken token) {
        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (!post.getProject().getProjectId().equals(projectId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        var user = userRepository.findById(userId).orElseThrow();

        var comment = new Comment();
        comment.setPost(post);
        comment.setUser(user);
        comment.setContent(dto.content());

        var saved = commentRepository.save(comment);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new CommentDto(saved.getCommentId(), saved.getContent(), saved.getUser().getUsername(), saved.getCreationTimestamp()));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID projectId,
                                        @PathVariable Long postId,
                                        @PathVariable UUID commentId,
                                        JwtAuthenticationToken token) {
        UUID userId = UUID.fromString(token.getName());
        authorization.requireAtLeast(projectId, userId, ProjectRole.MEMBER);

        var comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        boolean isAuthor  = comment.getUser().getUserId().equals(userId);
        boolean isManager = authorization.getMembership(projectId, userId).getRole().ordinal() <= ProjectRole.MANAGER.ordinal();

        if (!isAuthor && !isManager) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        commentRepository.deleteById(commentId);
        return ResponseEntity.noContent().build();
    }
}
