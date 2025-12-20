import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Brain, 
  MessageCircle,
  Loader2,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "How do I mark my attendance?",
  "How can I check my exam results?",
  "How do I apply for leave?",
  "How to link my child's account?",
  "What features are available for teachers?",
  "How do I change my profile settings?",
];

const AIHelpAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-help-assistant", {
        body: { 
          message: messageText,
          conversationHistory: messages.slice(-10) // Keep last 10 messages for context
        }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.response || "I'm sorry, I couldn't process your question." 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("AI Help error:", error);
      toast.error("Failed to get AI response. Please try again.");
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question);
  };

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      {/* 3D Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-300" />
        
        {/* 3D Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(var(--primary-rgb), 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(var(--primary-rgb), 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'top center',
          }}
        />

        {/* Floating 3D icons */}
        <div className="absolute top-8 right-8 text-primary/10 animate-bounce" style={{ animationDelay: '0s' }}>
          <Brain className="w-12 h-12" />
        </div>
        <div className="absolute bottom-32 left-8 text-blue-500/10 animate-bounce" style={{ animationDelay: '0.5s' }}>
          <Lightbulb className="w-10 h-10" />
        </div>
        <div className="absolute top-1/3 right-12 text-purple-500/10 animate-bounce" style={{ animationDelay: '1s' }}>
          <Zap className="w-8 h-8" />
        </div>
        <div className="absolute bottom-48 right-1/4 text-green-500/10 animate-bounce" style={{ animationDelay: '1.5s' }}>
          <BookOpen className="w-10 h-10" />
        </div>
      </div>

      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse" />
            <div className="relative p-3 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              SVIT ERP AI Assistant
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Powered by AI • Ask me anything about the app
            </p>
          </div>
          <Badge variant="outline" className="ml-auto border-green-500/50 text-green-600 bg-green-500/10">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />
            Online
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Chat Messages Area */}
        <div className="relative rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden">
          <ScrollArea className="h-[350px] p-4" ref={scrollAreaRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative p-4 rounded-full bg-gradient-to-br from-muted to-muted/50">
                    <HelpCircle className="w-10 h-10 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">How can I help you today?</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ask me anything about using SVIT ERP
                  </p>
                </div>
                
                {/* Suggested Questions */}
                <div className="w-full mt-4">
                  <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 hover:scale-105"
                        onClick={() => handleSuggestedQuestion(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-md">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted/80 backdrop-blur-sm border border-border/50 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0">
                        <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="p-2 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-md">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="bg-muted/80 backdrop-blur-sm border border-border/50 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question here..."
              className="min-h-[50px] max-h-[120px] resize-none pr-4 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-all duration-300"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <MessageCircle className="absolute right-3 top-3 w-4 h-4 text-muted-foreground/50" />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="h-auto px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>

        {/* Quick Tips */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd>
            to send
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">Shift+Enter</kbd>
            for new line
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIHelpAssistant;
