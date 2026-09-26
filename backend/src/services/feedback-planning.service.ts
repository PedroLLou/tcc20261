import { Injectable } from '@nestjs/common';

export interface FeedbackPlanningDraft {
  objective?: string;
  status?: string;
}

@Injectable()
export class FeedbackPlanningService {
  saveDraft(planning: FeedbackPlanningDraft): FeedbackPlanningDraft {
    return {
      ...planning,
      status: 'RASCUNHO',
    };
  }
}
