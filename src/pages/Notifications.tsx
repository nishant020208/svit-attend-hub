import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, Mail, MessageSquare, Send, Users, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Notifications() {
  const navigate = useNavigate();
  const { role, loading: roleLoading, userId } = useUserRole();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Form states
  const [emailForm, setEmailForm] = useState({
    recipient: "",
    subject: "",
    message: "",
    priority: "normal"
  });
  const [groupForm, setGroupForm] = useState({
    targetGroup: "ALL",
    title: "",
    content: ""
  });

  useEffect(() => {
    checkAuth();
  }, [role]);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to real-time notifications
    const notificationsChannel = supabase
      .channel('notifications-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    // Subscribe to real-time messages
    const messagesChannel = supabase
      .channel('messages-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      }, () => {
        fetchMessages();
      })
      .subscribe();

    // Subscribe to real-time group messages
    const groupChannel = supabase
      .channel('group-messages-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_messages'
      }, () => {
        fetchGroupMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(groupChannel);
    };
  }, [userId]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      if (userId) {
        await Promise.all([
          fetchNotifications(),
          fetchMessages(),
          fetchGroupMessages()
        ]);
      }
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!userId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: any) => !n.read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchMessages = async () => {
    if (!userId) return;

    try {
      const { data, error } = await (supabase as any)
        .from("messages")
        .select(`
          *,
          sender:sender_id(profiles(name, email)),
          recipient:recipient_id(profiles(name, email))
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchGroupMessages = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("group_messages")
        .select(`
          *,
          sender:sender_id(profiles(name))
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGroupMessages(data || []);
    } catch (error) {
      console.error("Error fetching group messages:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const sendEmailNotification = async () => {
    if (!emailForm.recipient || !emailForm.subject || !emailForm.message) {
      toast.error("Please fill in all fields");
      return;
    }

    setSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: emailForm.recipient,
          subject: emailForm.subject,
          message: emailForm.message,
          priority: emailForm.priority
        }
      });

      if (error) throw error;

      toast.success("Email notification sent successfully");
      setEmailForm({ recipient: "", subject: "", message: "", priority: "normal" });
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const sendGroupMessage = async () => {
    if (!groupForm.title || !groupForm.content) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("group_messages")
        .insert({
          sender_id: userId,
          target_group: groupForm.targetGroup,
          title: groupForm.title,
          content: groupForm.content
        });

      if (error) throw error;

      toast.success("Group message sent successfully");
      setGroupForm({ targetGroup: "ALL", title: "", content: "" });
      fetchGroupMessages();
    } catch (error: any) {
      console.error("Error sending group message:", error);
      toast.error(error.message || "Failed to send group message");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      urgent: "destructive",
      high: "default",
      normal: "secondary",
      low: "outline"
    };
    return <Badge variant={variants[priority] || "secondary"}>{priority.toUpperCase()}</Badge>;
  };

  if (roleLoading || loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={role} />
      <main className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent">Notifications & Messages</h1>
            <p className="text-muted-foreground mt-2">Stay updated with real-time notifications</p>
          </div>
          <Badge variant="destructive" className="text-lg px-4 py-2">
            <Bell className="h-5 w-5 mr-2" />
            {unreadCount} Unread
          </Badge>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Users className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map(notification => (
                <Card 
                  key={notification.id} 
                  className={`hover-lift cursor-pointer transition-all ${!notification.read ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(notification.priority)}
                            {!notification.read && <Badge>New</Badge>}
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            {(role === "ADMIN" || role === "FACULTY") && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full mb-4">
                    <Send className="h-4 w-4 mr-2" />
                    Send Email Notification
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Email Notification</DialogTitle>
                    <DialogDescription>Send an email notification to a user</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recipient">Recipient Email</Label>
                      <Input 
                        id="recipient"
                        type="email"
                        value={emailForm.recipient}
                        onChange={(e) => setEmailForm({...emailForm, recipient: e.target.value})}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={emailForm.priority} onValueChange={(value) => setEmailForm({...emailForm, priority: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input 
                        id="subject"
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                        placeholder="Important update..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message"
                        value={emailForm.message}
                        onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                        placeholder="Enter your message..."
                        rows={5}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={sendEmailNotification} disabled={sendingEmail}>
                      <Mail className="h-4 w-4 mr-2" />
                      {sendingEmail ? "Sending..." : "Send Email"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {messages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                </CardContent>
              </Card>
            ) : (
              messages.map(message => (
                <Card key={message.id} className="hover-lift">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {message.sender_id === userId ? `To: ${message.recipient?.profiles?.name}` : `From: ${message.sender?.profiles?.name}`}
                        </CardTitle>
                        {message.subject && <CardDescription>{message.subject}</CardDescription>}
                      </div>
                      {!message.read && message.recipient_id === userId && <Badge>New</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{message.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="announcements" className="space-y-4">
            {(role === "ADMIN" || role === "FACULTY") && (
              <Card>
                <CardHeader>
                  <CardTitle>Send Group Announcement</CardTitle>
                  <CardDescription>Broadcast a message to a group</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Target Group</Label>
                    <Select value={groupForm.targetGroup} onValueChange={(value) => setGroupForm({...groupForm, targetGroup: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="ALL">Everyone</SelectItem>
                        <SelectItem value="STUDENTS">All Students</SelectItem>
                        <SelectItem value="FACULTY">All Faculty</SelectItem>
                        <SelectItem value="PARENTS">All Parents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input 
                      value={groupForm.title}
                      onChange={(e) => setGroupForm({...groupForm, title: e.target.value})}
                      placeholder="Announcement title..."
                    />
                  </div>
                  <div>
                    <Label>Content</Label>
                    <Textarea 
                      value={groupForm.content}
                      onChange={(e) => setGroupForm({...groupForm, content: e.target.value})}
                      placeholder="Write your announcement..."
                      rows={5}
                    />
                  </div>
                  <Button onClick={sendGroupMessage} className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Send Announcement
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {groupMessages.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No announcements yet</p>
                  </CardContent>
                </Card>
              ) : (
                groupMessages.map(announcement => (
                  <Card key={announcement.id} className="hover-lift border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{announcement.title}</CardTitle>
                          <CardDescription>
                            From: {announcement.sender?.profiles?.name} • To: {announcement.target_group}
                          </CardDescription>
                        </div>
                        <Badge>Group</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(announcement.created_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}