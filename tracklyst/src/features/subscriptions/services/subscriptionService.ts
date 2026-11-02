import { supabase } from "@/src/lib/supabase";
import type { Transaction } from "@/src/features/transaction/types/transaction.types";
import type {
  CreateSubscriptionDTO,
  Subscription,
  UpdateSubscriptionDTO,
} from "../types/subscription.types";
import { nextOccurrenceAfter } from "../utils/schedule";

const SELECT = `
  *,
  category:categories(id, name, icon, color)
`;

/**
 * Abonnements = règles récurrentes de dépense (table recurring_rules).
 * Aucune transaction n'est créée automatiquement : à chaque échéance,
 * l'utilisateur valide (→ transaction) ou ignore (→ échéance suivante).
 */
export const subscriptionService = {
  async getSubscriptions(budgetId: string): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from("recurring_rules")
      .select(SELECT)
      .eq("budget_id", budgetId)
      .eq("type", "expense")
      .order("next_occurrence", { ascending: true });

    if (error) throw error;
    return data as Subscription[];
  },

  async createSubscription(dto: CreateSubscriptionDTO): Promise<Subscription> {
    const { data, error } = await supabase
      .from("recurring_rules")
      .insert({
        ...dto,
        type: "expense",
        interval: 1,
        next_occurrence: dto.start_date,
      })
      .select(SELECT)
      .single();

    if (error) throw error;
    return data as Subscription;
  },

  async updateSubscription(
    id: string,
    dto: UpdateSubscriptionDTO,
  ): Promise<Subscription> {
    const { data, error } = await supabase
      .from("recurring_rules")
      .update(dto)
      .eq("id", id)
      .select(SELECT)
      .single();

    if (error) throw error;
    return data as Subscription;
  },

  async deleteSubscription(id: string): Promise<void> {
    const { error } = await supabase
      .from("recurring_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Passe à l'échéance suivante. Conditionné sur l'échéance actuelle :
   * un double tap ne fait avancer qu'une fois. Retourne null si une autre
   * action a déjà avancé la règle.
   */
  async advance(sub: Subscription): Promise<Subscription | null> {
    const next = nextOccurrenceAfter(sub);
    const ended = !!sub.end_date && next > sub.end_date;
    const { data, error } = await supabase
      .from("recurring_rules")
      .update({ next_occurrence: next, ...(ended && { is_active: false }) })
      .eq("id", sub.id)
      .eq("next_occurrence", sub.next_occurrence)
      .select(SELECT);

    if (error) throw error;
    return (data?.[0] as Subscription) ?? null;
  },

  /**
   * Valide l'échéance : crée la dépense datée du jour d'échéance puis
   * avance la règle.
   */
  async confirm(
    sub: Subscription,
  ): Promise<{ transaction: Transaction; subscription: Subscription } | null> {
    const advanced = await this.advance(sub);
    if (!advanced) return null;

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        budget_id: sub.budget_id,
        category_id: sub.category_id,
        amount: sub.amount,
        type: "expense",
        description: sub.description,
        date: sub.next_occurrence,
        is_recurring: true,
        recurring_rule_id: sub.id,
      })
      .select(
        `
        *,
        category:categories(id, name, icon, color)
      `,
      )
      .single();

    if (error) {
      // Annule l'avance pour que l'échéance reste à valider.
      await supabase
        .from("recurring_rules")
        .update({ next_occurrence: sub.next_occurrence, is_active: sub.is_active })
        .eq("id", sub.id);
      throw error;
    }
    return { transaction: data as Transaction, subscription: advanced };
  },
};
