export type GoalStatus = 'in_progress' | 'completed' | 'cancelled' | 'paused';
export type GoalTxType = 'deposit' | 'withdrawal';

export interface Goal {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null; // ISO date
  category_id: string | null;
  icon: string | null;
  color: string | null;
  priority: number;
  status: GoalStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  category?: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  };
}

export interface CreateGoalDTO {
  budget_id: string;
  name: string;
  target_amount: number;
  description?: string;
  deadline?: string;
  category_id?: string;
  icon?: string;
  color?: string;
  priority?: number;
}

export type UpdateGoalDTO = Partial<CreateGoalDTO> & {
  status?: GoalStatus;
  current_amount?: number;
};

export interface GoalTransaction {
  id: string;
  goal_id: string;
  budget_id: string;
  amount: number;
  type: GoalTxType;
  description: string | null;
  date: string;
  created_by: string | null;
  created_at: string;
}

export interface CreateGoalTransactionDTO {
  goal_id: string;
  budget_id: string;
  amount: number;
  type: GoalTxType;
  description?: string;
  date: string;
}

