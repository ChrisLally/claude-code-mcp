// server/types.ts

import { ChildProcess } from 'child_process';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export interface ServerConfig {
    port: number;
    baseUrl: string;
    apiKey?: string;
    defaultWorkingDirectory: string;
    defaultAllowedTools: string[];
    oauth: OAuthConfig;
    transport: 'stdio' | 'sse';
    maxConcurrentSessions: number;
    sessionTimeoutMs: number;
    rateLimitEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindowMs: number;
    metricsEnabled: boolean;
    webhooksEnabled: boolean;
    webhookUrl?: string;
}

export interface OAuthConfig {
    enabled: boolean;
    clientId?: string;
    clientSecret?: string;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    issuer: string;
}

export interface AskRequest {
    query: string;
    sessionId?: string;
    allowedTools?: string[];
    disallowedTools?: string[];
    workingDirectory?: string;
    model?: string;
    subagent?: string;
    thinkingLevel?: 'think' | 'think-hard' | 'think-harder' | 'ultrathink';
    hooks?: Record<string, string>;
    backgroundTask?: boolean;
    priority?: 'low' | 'normal' | 'high';
}

export interface PlanRequest {
    query: string;
    sessionId?: string;
    workingDirectory?: string;
    model?: string;
}

export interface ResumeRequest {
    sessionId: string;
    query?: string;
    workingDirectory?: string;
}

export interface CheckpointRequest {
    action: 'create' | 'list' | 'restore' | 'compare' | 'delete';
    sessionId: string;
    checkpointId?: string;
    compareWith?: string;
    label?: string;
}

export interface SubagentListRequest {
    workingDirectory?: string;
    includePlugins?: boolean;
}

export interface PluginListRequest {
    scope: 'user' | 'project' | 'all';
}

export interface PluginInstallRequest {
    plugin: string;
    scope: 'user' | 'project';
}

export interface BackgroundTaskRequest {
    action: 'list' | 'stop' | 'logs' | 'restart';
    taskId?: string;
}

export interface AbortRequest {
    sessionId?: string;
    taskId?: string;
}

export interface ExecutionResult {
    output: string;
    metadata?: Record<string, any>;
}

export interface ClaudeResponse {
    session_id?: string;
    content?: string;
    type?: string;
    [key: string]: any;
}

export interface OAuthTokenRequest {
    grant_type: string;
    code?: string;
    code_verifier?: string;
    refresh_token?: string;
    client_id?: string;
    client_secret?: string;
    resource?: string;
}

export interface OAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}

export interface PKCEChallenge {
    code_challenge: string;
    code_verifier: string;
    code_challenge_method: 'S256';
}

export interface SessionData {
    sessionId: string;
    transport: SSEServerTransport;
    createdAt: Date;
    lastActivity: Date;
    userId?: string;
    metadata?: Record<string, any>;
}

export interface BackgroundTask {
    id: string;
    process: ChildProcess;
    startTime: Date;
    status: 'running' | 'completed' | 'failed' | 'stopped';
    logs: Array<{ timestamp: Date; level: string; message: string }>;
    sessionId?: string;
    priority: 'low' | 'normal' | 'high';
    exitCode?: number;
}

export interface Checkpoint {
    id: string;
    sessionId: string;
    label: string;
    timestamp: Date;
    state?: any;
}

export interface MetricsData {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    activeConnections: number;
    uptime: number;
    toolCalls: Record<string, number>;
}

export interface WebhookPayload {
    event: string;
    timestamp: string;
    [key: string]: any;
}