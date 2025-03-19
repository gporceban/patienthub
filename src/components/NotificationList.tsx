
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Notification, getNotifications, markNotificationsAsRead } from '@/types/notifications';
import { Bell, Check, Info, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationListProps {
  userId: string;
  userType: 'medico' | 'paciente';
  limit?: number;
}

const NotificationList: React.FC<NotificationListProps> = ({ 
  userId, 
  userType,
  limit 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Map icon types to components
  const iconMap = {
    'info': <Info className="h-5 w-5 text-blue-500" />,
    'alert': <AlertTriangle className="h-5 w-5 text-amber-500" />,
    'calendar': <Calendar className="h-5 w-5 text-green-500" />,
    'default': <Bell className="h-5 w-5 text-gold-500" />
  };

  const fetchNotifications = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await getNotifications(supabase, userType, userId);

      if (error) throw error;
      
      // Apply limit if provided
      const limitedData = limit ? data.slice(0, limit) : data;
      setNotifications(limitedData || []);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar notificações",
        description: "Não foi possível carregar suas notificações."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId?: string) => {
    try {
      const { error } = await markNotificationsAsRead(supabase, userType, userId, notificationId);
      
      if (error) throw error;
      
      if (notificationId) {
        // Mark a single notification as read
        setNotifications(notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true } 
            : notification
        ));
      } else {
        // Mark all as read
        setNotifications(notifications.map(notification => ({ ...notification, read: true })));
      }
      
      toast({
        title: notificationId ? "Notificação marcada como lida" : "Todas notificações marcadas como lidas",
        description: "Status das notificações atualizado com sucesso."
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar notificação",
        description: "Não foi possível marcar a notificação como lida."
      });
    }
  };

  // Format relative time from timestamp
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: ptBR 
      });
    } catch (error) {
      return 'Data desconhecida';
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId, userType]);

  const hasUnreadNotifications = notifications.some(notification => !notification.read);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(limit || 3)].map((_, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Bell className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium mb-2">Nenhuma notificação</h3>
        <p className="text-muted-foreground">
          Você não possui notificações no momento.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold">Notificações</h2>
          <p className="text-sm text-muted-foreground">
            {notifications.length} notificações {hasUnreadNotifications ? 
              `(${notifications.filter(n => !n.read).length} não lidas)` : ''}
          </p>
        </div>
        
        {hasUnreadNotifications && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleMarkAsRead()}
            className="flex gap-1 items-center"
          >
            <Check className="h-4 w-4" />
            <span>Marcar todas como lidas</span>
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {notifications.map((notification) => (
          <Card 
            key={notification.id}
            className={`p-4 relative overflow-hidden transition-colors ${
              notification.read 
                ? 'border-darkblue-800/50 bg-darkblue-900/50'
                : 'border-l-4 border-l-gold-500 bg-darkblue-800/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${
                notification.read ? 'bg-darkblue-800/80' : 'bg-darkblue-800'
              }`}>
                {(iconMap as any)[notification.icon_type] || iconMap.default}
              </div>
              
              <div className="flex-1">
                <h3 className={`font-medium ${notification.read ? 'text-gray-300' : 'text-gold-300'}`}>
                  {notification.title}
                </h3>
                <p className={`text-sm ${notification.read ? 'text-gray-400' : 'text-gray-300'}`}>
                  {notification.message}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                  
                  {!notification.read && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-xs"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Marcar como lida
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NotificationList;
