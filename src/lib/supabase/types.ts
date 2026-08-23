export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          default_brokerage: number
          default_tax: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          starting_capital?: number
          default_brokerage?: number
          default_tax?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          default_brokerage?: number
          default_tax?: number
          created_at?: string
          updated_at?: string
        }
      }
      capital_transactions: {
        Row: {
          id: string
          user_id: string
          transaction_type: "deposit" | "withdrawal"
          amount: number
          balance_after: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_type: "deposit" | "withdrawal"
          amount: number
          balance_after: number
          date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_type?: "deposit" | "withdrawal"
          amount?: number
          balance_after?: number
          date?: string
          notes?: string | null
          created_at?: string
        }
      }
      strategies: {
        Row: {
          id: string
          user_id: string
          name: string
          market: string | null
          conditions: string | null
          entry_rules: string | null
          stop_loss_rules: string | null
          target_rules: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          market?: string | null
          conditions?: string | null
          entry_rules?: string | null
          stop_loss_rules?: string | null
          target_rules?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          market?: string | null
          conditions?: string | null
          entry_rules?: string | null
          stop_loss_rules?: string | null
          target_rules?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          strategy_id: string | null
          trading_day_id: string | null
          date: string
          symbol: string
          trade_type: "buy" | "sell"
          entry_price: number
          exit_price: number
          quantity: number
          notional_value: number
          brokerage: number
          taxes: number
          capital_used: number
          capital_used_percent: number
          gross_pnl: number
          net_pnl: number
          trade_return_percent: number
          trade_review_score: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          strategy_id?: string | null
          trading_day_id?: string | null
          date: string
          symbol: string
          trade_type: "buy" | "sell"
          entry_price: number
          exit_price: number
          quantity: number
          notional_value?: number
          brokerage?: number
          taxes?: number
          capital_used?: number
          capital_used_percent?: number
          gross_pnl?: number
          net_pnl?: number
          trade_return_percent?: number
          trade_review_score?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          strategy_id?: string | null
          trading_day_id?: string | null
          date?: string
          symbol?: string
          trade_type?: "buy" | "sell"
          entry_price?: number
          exit_price?: number
          quantity?: number
          notional_value?: number
          brokerage?: number
          taxes?: number
          capital_used?: number
          capital_used_percent?: number
          gross_pnl?: number
          net_pnl?: number
          trade_return_percent?: number
          trade_review_score?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      rules: {
        Row: {
          id: string
          user_id: string
          category: "entry" | "exit" | "risk_management" | "psychology"
          title: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: "entry" | "exit" | "risk_management" | "psychology"
          title: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: "entry" | "exit" | "risk_management" | "psychology"
          title?: string
          description?: string | null
          created_at?: string
        }
      }
      mistakes: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
      }
      trade_mistakes: {
        Row: {
          id: string
          trade_id: string
          mistake_id: string
        }
        Insert: {
          id?: string
          trade_id: string
          mistake_id: string
        }
        Update: {
          id?: string
          trade_id?: string
          mistake_id?: string
        }
      }
      trade_rule_adherence: {
        Row: {
          id: string
          trade_id: string
          rule_id: string
          status: "followed" | "broken"
        }
        Insert: {
          id?: string
          trade_id: string
          rule_id: string
          status: "followed" | "broken"
        }
        Update: {
          id?: string
          trade_id?: string
          rule_id?: string
          status?: "followed" | "broken"
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      get_capital_at_date: {
        Args: {
          p_user_id: string
          p_date: string
        }
        Returns: number
      }
      get_dashboard_stats: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      get_equity_curve: {
        Args: {
          p_user_id: string
        }
        Returns: {
          trade_date: string
          daily_net_pnl: number
          daily_gross_pnl: number
        }[]
      }
      insert_trade_atomic: {
        Args: {
          p_trade_data: Json
          p_mistake_ids: string[]
          p_rule_adherences: Json
        }
        Returns: string
      }
      update_trade_atomic: {
        Args: {
          p_trade_id: string
          p_trade_data: Json
          p_mistake_ids: string[]
          p_rule_adherences: Json
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
