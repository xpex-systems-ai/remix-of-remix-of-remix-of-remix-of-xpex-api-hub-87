import { supabase } from '@/integrations/supabase/client';

type RetentionEventType = 
  | 'retention.milestone.day_1'
  | 'retention.milestone.day_3'
  | 'retention.milestone.day_7'
  | 'retention.milestone.day_14'
  | 'retention.milestone.day_30'
  | 'retention.milestone.day_60'
  | 'retention.milestone.day_90'
  | 'retention.milestone.day_180'
  | 'retention.milestone.day_365'
  | 'churn.risk.low'
  | 'churn.risk.medium'
  | 'churn.risk.high'
  | 'churn.risk.critical'
  | 'user.reactivated'
  | 'user.resurrected'
  | 'activation.account_created'
  | 'activation.profile_completed'
  | 'activation.first_api_key'
  | 'activation.first_validation'
  | 'activation.first_purchase'
  | 'segment.transition';

interface RetentionWebhookData {
  milestone_days?: number;
  milestone_type?: string;
  risk_score?: number;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  risk_factors?: string[];
  days_inactive?: number;
  days_since_last_visit?: number;
  is_reactivation?: boolean;
  is_resurrection?: boolean;
  activation_step?: string;
  activation_progress?: number;
  from_segment?: string;
  to_segment?: string;
  transition_reason?: string;
  cohort_week?: string;
  cohort_month?: string;
  subscription_tier?: string;
  total_validations?: number;
  credits_balance?: number;
}

export const useRetentionWebhooks = () => {
  const sendRetentionWebhook = async (
    userId: string,
    eventType: RetentionEventType,
    data: RetentionWebhookData
  ) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('send-retention-webhook', {
        body: {
          event_type: eventType,
          user_id: userId,
          data
        }
      });

      if (error) {
        console.error('[RetentionWebhook] Error sending webhook:', error);
        return { success: false, error };
      }

      console.log('[RetentionWebhook] Webhook sent:', response);
      return { success: true, data: response };
    } catch (error) {
      console.error('[RetentionWebhook] Exception:', error);
      return { success: false, error };
    }
  };

  const sendMilestoneWebhook = async (userId: string, milestoneDays: number) => {
    const milestoneMap: Record<number, RetentionEventType> = {
      1: 'retention.milestone.day_1',
      3: 'retention.milestone.day_3',
      7: 'retention.milestone.day_7',
      14: 'retention.milestone.day_14',
      30: 'retention.milestone.day_30',
      60: 'retention.milestone.day_60',
      90: 'retention.milestone.day_90',
      180: 'retention.milestone.day_180',
      365: 'retention.milestone.day_365',
    };

    const eventType = milestoneMap[milestoneDays];
    if (!eventType) return { success: false, error: 'Invalid milestone' };

    const milestoneType = milestoneDays === 1 ? 'day_1' :
                         milestoneDays <= 7 ? 'first_week' :
                         milestoneDays <= 30 ? 'first_month' :
                         milestoneDays <= 90 ? 'first_quarter' : 'long_term';

    return sendRetentionWebhook(userId, eventType, {
      milestone_days: milestoneDays,
      milestone_type: milestoneType,
    });
  };

  const sendChurnRiskWebhook = async (
    userId: string,
    riskScore: number,
    daysInactive: number,
    riskFactors?: string[]
  ) => {
    const riskLevel: 'low' | 'medium' | 'high' | 'critical' = 
      riskScore >= 80 ? 'critical' :
      riskScore >= 60 ? 'high' :
      riskScore >= 40 ? 'medium' : 'low';

    const eventType: RetentionEventType = 
      riskLevel === 'critical' ? 'churn.risk.critical' :
      riskLevel === 'high' ? 'churn.risk.high' :
      riskLevel === 'medium' ? 'churn.risk.medium' : 'churn.risk.low';

    return sendRetentionWebhook(userId, eventType, {
      risk_score: riskScore,
      risk_level: riskLevel,
      risk_factors: riskFactors,
      days_inactive: daysInactive,
    });
  };

  const sendUserReturnWebhook = async (
    userId: string,
    daysSinceLastVisit: number
  ) => {
    const isReactivation = daysSinceLastVisit > 7;
    const isResurrection = daysSinceLastVisit > 30;
    
    const eventType: RetentionEventType = isResurrection 
      ? 'user.resurrected' 
      : 'user.reactivated';

    return sendRetentionWebhook(userId, eventType, {
      days_since_last_visit: daysSinceLastVisit,
      is_reactivation: isReactivation,
      is_resurrection: isResurrection,
    });
  };

  const sendActivationWebhook = async (
    userId: string,
    activationStep: 'account_created' | 'profile_completed' | 'first_api_key' | 'first_validation' | 'first_purchase',
    activationProgress: number
  ) => {
    const eventType: RetentionEventType = `activation.${activationStep}` as RetentionEventType;

    return sendRetentionWebhook(userId, eventType, {
      activation_step: activationStep,
      activation_progress: activationProgress,
    });
  };

  const sendSegmentTransitionWebhook = async (
    userId: string,
    fromSegment: string,
    toSegment: string,
    reason?: string
  ) => {
    return sendRetentionWebhook(userId, 'segment.transition', {
      from_segment: fromSegment,
      to_segment: toSegment,
      transition_reason: reason,
    });
  };

  return {
    sendRetentionWebhook,
    sendMilestoneWebhook,
    sendChurnRiskWebhook,
    sendUserReturnWebhook,
    sendActivationWebhook,
    sendSegmentTransitionWebhook,
  };
};
