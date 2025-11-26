import { z } from 'zod';

// ============================================================================
// SESSION PROFILES
// ============================================================================

export const SessionProfileSchema = z.object({
  name: z.string(),
  agents: z.array(z.string()),
  skills: z.array(z.string()),
  focus_keywords: z.array(z.string()),
});

export type SessionProfile = z.infer<typeof SessionProfileSchema>;

// ============================================================================
// TASK STATE
// ============================================================================

export const TaskStatusSchema = z.enum([
  'pending',
  'claimed',
  'in_progress',
  'completed',
  'merged',
  'skipped',
  'stuck',
  'needs_human',
]);

export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  spec_id: z.string(),
  task_group_id: z.string(),
  role: z.string().optional(),
  complexity: z.enum(['xs', 's', 'm', 'l', 'xl']).optional(),
  status: TaskStatusSchema,
  assigned_session: z.string().nullable(),
  branch: z.string().nullable(),
  
  // Timestamps
  created_at: z.string(),
  claimed_at: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  merged_at: z.string().nullable(),
  
  // Files and notes
  files_touched: z.array(z.string()),
  notes: z.string().nullable(),
  
  // Review state
  review_attempts: z.number().default(0),
  max_review_attempts: z.number().default(3),
  last_review_issues: z.array(z.string()),
  
  // Escalation state
  escalated_to_strategist: z.boolean().default(false),
  strategist_decision: z.string().nullable(),
  human_needed: z.string().nullable(),
  skip_reason: z.string().nullable(),
  backlog_note: z.string().nullable(),
});

export type Task = z.infer<typeof TaskSchema>;

// ============================================================================
// SESSION STATE
// ============================================================================

export const SessionStatusSchema = z.enum([
  'idle',
  'working',
  'waiting',
  'completed',
  'error',
]);

export const SessionSchema = z.object({
  session_id: z.string(),
  name: z.string(),
  profile: z.string(),
  status: SessionStatusSchema,
  current_task: z.string().nullable(),
  current_branch: z.string().nullable(),
  last_heartbeat: z.string().nullable(),
  completed_tasks: z.array(z.string()),
  failed_tasks: z.array(z.string()),
});

export type Session = z.infer<typeof SessionSchema>;

// ============================================================================
// SPEC STATE
// ============================================================================

export const SpecStatusSchema = z.enum([
  'pending',
  'planning',
  'in_progress',
  'completed',
  'verified',
]);

export const SpecStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  wave: z.number(),
  status: SpecStatusSchema,
  
  current_task_wave: z.number(),
  total_task_waves: z.number(),
  
  tasks_total: z.number(),
  tasks_completed: z.number(),
  tasks_merged: z.number(),
  tasks_skipped: z.number(),
  tasks_stuck: z.number(),
  
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  verified_at: z.string().nullable(),
});

export type SpecState = z.infer<typeof SpecStateSchema>;

// ============================================================================
// EXECUTION PLAN
// ============================================================================

export const SpecWaveSchema = z.object({
  wave: z.number(),
  name: z.string(),
  description: z.string().optional(),
  specs: z.array(z.object({
    id: z.string(),
    estimated_tasks: z.number(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  })),
  parallel: z.boolean().default(true),
  depends_on: z.array(z.number()).default([]),
  estimated_duration: z.string().optional(),
});

export const ExecutionPlanSchema = z.object({
  version: z.string().default('1.0'),
  project: z.string(),
  created_at: z.string(),
  
  total_specs: z.number(),
  total_estimated_tasks: z.number(),
  
  spec_waves: z.array(SpecWaveSchema),
  
  session_profiles: z.record(z.string(), SessionProfileSchema),
  
  notifications: z.object({
    email: z.string(),
    notify_on: z.array(z.enum([
      'spec_wave_complete',
      'spec_stuck',
      'project_complete',
      'human_needed',
    ])),
  }),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

// ============================================================================
// MASTER STATE
// ============================================================================

export const MasterStateSchema = z.object({
  version: z.string().default('1.0'),
  project: z.string(),
  
  // Execution tracking
  is_running: z.boolean(),
  current_spec_wave: z.number(),
  total_spec_waves: z.number(),
  
  // Spec states
  specs: z.record(z.string(), SpecStateSchema),
  
  // Overall progress
  overall: z.object({
    specs_pending: z.number(),
    specs_in_progress: z.number(),
    specs_completed: z.number(),
    specs_total: z.number(),
    
    tasks_completed: z.number(),
    tasks_merged: z.number(),
    tasks_skipped: z.number(),
    tasks_stuck: z.number(),
    tasks_total: z.number(),
    
    started_at: z.string().nullable(),
    last_updated: z.string(),
  }),
  
  // Interventions log
  interventions: z.array(z.object({
    timestamp: z.string(),
    task_id: z.string(),
    type: z.enum(['fix_applied', 'skipped', 'spec_modified', 'human_needed']),
    description: z.string(),
  })),
});

export type MasterState = z.infer<typeof MasterStateSchema>;

// ============================================================================
// CONFIG
// ============================================================================

export const DevFactoryConfigSchema = z.object({
  project_name: z.string(),
  repo_url: z.string().optional(),
  branch_prefix: z.string().default('devfactory/'),
  
  sessions: z.object({
    count: z.number().default(3),
    profiles: z.array(z.string()).default(['backend', 'frontend', 'testing']),
  }),
  
  orchestrator: z.object({
    model: z.string().default('claude-sonnet-4-20250514'),
    strategist_model: z.string().default('claude-sonnet-4-20250514'),
    max_review_attempts: z.number().default(3),
  }),
  
  notifications: z.object({
    email: z.string(),
    sendgrid_configured: z.boolean().default(false),
  }),
});

export type DevFactoryConfig = z.infer<typeof DevFactoryConfigSchema>;

// ============================================================================
// STRATEGIST RESPONSE
// ============================================================================

export const StrategistDecisionSchema = z.enum([
  'DIFFERENT_APPROACH',
  'SKIP_TASK',
  'MODIFY_SPEC',
  'NEED_HUMAN',
]);

export const StrategistResponseSchema = z.object({
  decision: StrategistDecisionSchema,
  reasoning: z.string(),
  action: z.object({
    // For DIFFERENT_APPROACH
    solution: z.string().optional(),
    files_to_change: z.array(z.string()).optional(),
    code_changes: z.string().optional(),
    
    // For SKIP_TASK
    impact: z.string().optional(),
    backlog_note: z.string().optional(),
    
    // For MODIFY_SPEC
    spec_changes: z.string().optional(),
    task_changes: z.string().optional(),
    
    // For NEED_HUMAN
    what_is_needed: z.string().optional(),
    options_for_human: z.array(z.string()).optional(),
  }),
});

export type StrategistResponse = z.infer<typeof StrategistResponseSchema>;
