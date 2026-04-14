import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Calendar, GripVertical } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { PHASES, PHASE_BG_COLORS } from './launchDefaultSteps';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const STATUS_COLUMNS = [
  { id: 'waiting', label: '대기', color: 'bg-muted-foreground/20' },
  { id: 'in-progress', label: '진행중', color: 'bg-info/20' },
  { id: 'done', label: '완료', color: 'bg-success/20' },
];

interface LaunchKanbanBoardProps {
  steps: any[];
  profiles: any[];
  onStepClick: (step: any) => void;
  onRefresh: () => void;
}

export function LaunchKanbanBoard({ steps, profiles, onStepClick, onRefresh }: LaunchKanbanBoardProps) {
  const today = new Date();
  const getProfile = (id: string | null) => profiles.find(p => p.id === id);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const stepId = result.draggableId;
    const { error } = await supabase.from('launch_steps').update({ status: newStatus }).eq('id', stepId);
    if (error) {
      toast({ title: '상태 변경 실패', variant: 'destructive' });
    } else {
      onRefresh();
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4">
        {STATUS_COLUMNS.map(col => {
          const colSteps = steps.filter(s => s.status === col.id);
          return (
            <div key={col.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`h-3 w-3 rounded-full ${col.color}`} />
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-xs">{colSteps.length}</Badge>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[200px] p-2 rounded-lg border border-dashed transition-colors ${
                      snapshot.isDraggingOver ? 'bg-primary/5 border-primary/30' : 'border-border'
                    }`}
                  >
                    {colSteps.map((step, idx) => {
                      const assignee = getProfile(step.assignee_id);
                      const isOverdue = step.deadline && differenceInDays(new Date(step.deadline), today) < 0 && step.status !== 'done';
                      const daysLeft = step.deadline ? differenceInDays(new Date(step.deadline), today) : null;

                      return (
                        <Draggable key={step.id} draggableId={step.id} index={idx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${snapshot.isDragging ? 'opacity-80' : ''}`}
                            >
                              <Card
                                className={`cursor-pointer hover:shadow-md transition-shadow ${
                                  isOverdue ? 'ring-2 ring-destructive/40' : ''
                                } ${step.is_critical ? 'border-destructive/30' : ''}`}
                                onClick={() => onStepClick(step)}
                              >
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                      </div>
                                      <span className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                        {step.step_name}
                                      </span>
                                    </div>
                                    {step.is_critical && (
                                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                    )}
                                  </div>

                                  <Badge variant="outline" className={`text-[10px] border ${PHASE_BG_COLORS[step.phase] || ''}`}>
                                    {step.phase}
                                  </Badge>

                                  <div className="flex items-center justify-between">
                                    {assignee ? (
                                      <div className="flex items-center gap-1">
                                        <Avatar className="h-5 w-5">
                                          <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{assignee.avatar}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground">{assignee.name_kr}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">미지정</span>
                                    )}

                                    {daysLeft !== null && step.status !== 'done' && (
                                      <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                                        <Calendar className="h-3 w-3" />
                                        {isOverdue ? `D+${Math.abs(daysLeft)}` : `D-${daysLeft}`}
                                      </span>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
