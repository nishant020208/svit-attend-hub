import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Loader2, GraduationCap, User, Users, Shield, Cpu, Cog, Zap, CircuitBoard, Sparkles,
  Wifi, Monitor, HardDrive, Database, Server, Radio, Microchip, Binary, Code, Terminal,
  Laptop, Smartphone, Cable, Power, Battery, Lightbulb, Gauge, Settings, Wrench, BookOpen
} from "lucide-react";
import svitLogo from "@/assets/svit-logo-official.jpg";
import { ForgotPassword } from "./ForgotPassword";

// No hardcoded passwords - authentication is handled through Supabase

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

// Engineering-themed floating decorations
const FloatingIcon = ({ icon: Icon, className, delay = "0s" }: { icon: any; className: string; delay?: string }) => (
  <div 
    className={`absolute opacity-10 animate-float ${className}`}
    style={{ animationDelay: delay }}
  >
    <Icon className="w-full h-full text-primary" />
  </div>
);

export function RoleBasedAuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("STUDENT");
  const [authTab, setAuthTab] = useState<string>("login");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        if (error.message.includes("not whitelisted")) {
          toast({
            title: "Access Denied",
            description: `Your email is not whitelisted for ${selectedRole} access. Please contact the administrator.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Account created successfully! You can now log in.",
        });
        signupForm.reset();
        setAuthTab("login");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roleConfig = {
    STUDENT: {
      icon: GraduationCap,
      title: "Student Portal",
      description: "Access your courses, attendance, and grades",
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/25",
    },
    FACULTY: {
      icon: User,
      title: "Faculty Portal",
      description: "Manage classes, mark attendance, and grade students",
      gradient: "from-emerald-500 to-teal-500",
      shadow: "shadow-emerald-500/25",
    },
    PARENT: {
      icon: Users,
      title: "Parent Portal",
      description: "Monitor your child's academic progress",
      gradient: "from-purple-500 to-pink-500",
      shadow: "shadow-purple-500/25",
    },
    ADMIN: {
      icon: Shield,
      title: "Admin Portal",
      description: "Manage system settings and users",
      gradient: "from-orange-500 to-red-500",
      shadow: "shadow-orange-500/25",
    },
  };

  const currentRoleConfig = roleConfig[selectedRole as keyof typeof roleConfig];
  const RoleIcon = currentRoleConfig.icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
      
      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
      
      {/* Engineering & Electronics Floating Icons - Left Side */}
      <FloatingIcon icon={Cpu} className="w-16 h-16 top-[8%] left-[8%]" delay="0s" />
      <FloatingIcon icon={Microchip} className="w-12 h-12 top-[25%] left-[3%]" delay="0.3s" />
      <FloatingIcon icon={CircuitBoard} className="w-20 h-20 top-[45%] left-[5%]" delay="0.6s" />
      <FloatingIcon icon={Binary} className="w-10 h-10 top-[65%] left-[8%]" delay="0.9s" />
      <FloatingIcon icon={Database} className="w-14 h-14 bottom-[20%] left-[3%]" delay="1.2s" />
      <FloatingIcon icon={Terminal} className="w-12 h-12 bottom-[8%] left-[12%]" delay="1.5s" />
      
      {/* Engineering & Electronics Floating Icons - Right Side */}
      <FloatingIcon icon={Server} className="w-18 h-18 top-[10%] right-[5%]" delay="0.2s" />
      <FloatingIcon icon={Wifi} className="w-14 h-14 top-[28%] right-[8%]" delay="0.5s" />
      <FloatingIcon icon={Monitor} className="w-16 h-16 top-[48%] right-[3%]" delay="0.8s" />
      <FloatingIcon icon={HardDrive} className="w-12 h-12 top-[68%] right-[6%]" delay="1.1s" />
      <FloatingIcon icon={Laptop} className="w-14 h-14 bottom-[18%] right-[10%]" delay="1.4s" />
      <FloatingIcon icon={Code} className="w-10 h-10 bottom-[5%] right-[3%]" delay="1.7s" />
      
      {/* Top Area Icons */}
      <FloatingIcon icon={GraduationCap} className="w-20 h-20 top-[3%] left-[30%]" delay="0.1s" />
      <FloatingIcon icon={Sparkles} className="w-8 h-8 top-[5%] left-[45%]" delay="0.4s" />
      <FloatingIcon icon={BookOpen} className="w-16 h-16 top-[2%] right-[25%]" delay="0.7s" />
      
      {/* Bottom Area Icons */}
      <FloatingIcon icon={Zap} className="w-12 h-12 bottom-[12%] left-[25%]" delay="1s" />
      <FloatingIcon icon={Lightbulb} className="w-14 h-14 bottom-[5%] left-[40%]" delay="1.3s" />
      <FloatingIcon icon={Power} className="w-10 h-10 bottom-[8%] right-[35%]" delay="1.6s" />
      <FloatingIcon icon={Battery} className="w-12 h-12 bottom-[3%] right-[20%]" delay="1.9s" />
      
      {/* Rotating Cogs */}
      <div className="absolute w-24 h-24 top-[35%] left-[2%] opacity-5">
        <Cog className="w-full h-full text-primary animate-spin" style={{ animationDuration: "20s" }} />
      </div>
      <div className="absolute w-16 h-16 bottom-[30%] right-[2%] opacity-5">
        <Settings className="w-full h-full text-primary animate-spin" style={{ animationDuration: "15s", animationDirection: "reverse" }} />
      </div>
      
      {/* Additional Electronic Components */}
      <FloatingIcon icon={Radio} className="w-10 h-10 top-[55%] left-[12%]" delay="2s" />
      <FloatingIcon icon={Smartphone} className="w-12 h-12 top-[75%] right-[12%]" delay="2.2s" />
      <FloatingIcon icon={Cable} className="w-10 h-10 top-[18%] left-[18%]" delay="2.4s" />
      <FloatingIcon icon={Gauge} className="w-14 h-14 bottom-[25%] right-[18%]" delay="2.6s" />
      <FloatingIcon icon={Wrench} className="w-10 h-10 top-[38%] right-[12%]" delay="2.8s" />
      
      {/* Circuit Lines - Decorative */}
      <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M0 50 H40 M60 50 H100 M50 0 V40 M50 60 V100" stroke="currentColor" strokeWidth="1" fill="none" className="text-primary" />
            <circle cx="50" cy="50" r="3" fill="currentColor" className="text-primary" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* Main Card */}
      <Card className="w-full max-w-2xl relative z-10 border-0 bg-background/80 backdrop-blur-xl shadow-2xl shadow-black/50">
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Logo with Glow Effect */}
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full opacity-50 blur-lg group-hover:opacity-75 transition-opacity duration-500" />
              <img 
                src={svitLogo} 
                alt="SVIT Logo" 
                className="relative h-24 w-24 object-contain rounded-full border-4 border-white/20 shadow-xl transition-transform duration-500 group-hover:scale-110" 
              />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              SVIT ERP System
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Sardar Vallabhbhai Patel Institute of Technology
            </CardDescription>
            <p className="text-xs text-muted-foreground/70">Gujarat Technological University</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role Selection Tabs */}
          <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1.5 bg-secondary/50 rounded-xl">
              {Object.entries(roleConfig).map(([role, config]) => {
                const Icon = config.icon;
                return (
                  <TabsTrigger 
                    key={role}
                    value={role} 
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all duration-300 hover:bg-secondary"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">
                      {role === "FACULTY" ? "Teacher" : role.charAt(0) + role.slice(1).toLowerCase()}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Role Info Card with Gradient */}
          <div className={`p-4 rounded-xl bg-gradient-to-r ${currentRoleConfig.gradient} ${currentRoleConfig.shadow} shadow-lg transition-all duration-500`}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <RoleIcon className="h-8 w-8 text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-bold text-lg">{currentRoleConfig.title}</h3>
                <p className="text-sm text-white/80">{currentRoleConfig.description}</p>
              </div>
            </div>
          </div>

          {/* Login/Signup Tabs */}
          <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-secondary/50 rounded-xl p-1">
              <TabsTrigger 
                value="login" 
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 font-semibold"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all duration-300 font-semibold"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-4">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={`${selectedRole.toLowerCase()}@svit.ac.in`}
                    className="h-12 bg-secondary/50 border-secondary hover:border-primary/50 focus:border-primary transition-colors rounded-xl"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 bg-secondary/50 border-secondary hover:border-primary/50 focus:border-primary transition-colors rounded-xl"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <ForgotPassword />
                </div>
                <Button 
                  type="submit" 
                  className={`w-full h-12 text-base font-semibold bg-gradient-to-r ${currentRoleConfig.gradient} hover:opacity-90 transition-all duration-300 rounded-xl shadow-lg ${currentRoleConfig.shadow} hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <RoleIcon className="mr-2 h-5 w-5" />
                  )}
                  Log In as {selectedRole === "FACULTY" ? "Teacher" : selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={`${selectedRole.toLowerCase()}@svit.ac.in`}
                    className="h-12 bg-secondary/50 border-secondary hover:border-primary/50 focus:border-primary transition-colors rounded-xl"
                    {...signupForm.register("email")}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 bg-secondary/50 border-secondary hover:border-primary/50 focus:border-primary transition-colors rounded-xl"
                    {...signupForm.register("password")}
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 bg-secondary/50 border-secondary hover:border-primary/50 focus:border-primary transition-colors rounded-xl"
                    {...signupForm.register("confirmPassword")}
                  />
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className={`w-full h-12 text-base font-semibold bg-gradient-to-r ${currentRoleConfig.gradient} hover:opacity-90 transition-all duration-300 rounded-xl shadow-lg ${currentRoleConfig.shadow} hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <RoleIcon className="mr-2 h-5 w-5" />
                  )}
                  Sign Up as {selectedRole === "FACULTY" ? "Teacher" : selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4 px-4">
                Only whitelisted {selectedRole.toLowerCase()}s can register. Contact administrator for access.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex-col gap-2 pt-2 pb-6">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} Sardar Vallabhbhai Patel Institute of Technology
          </p>
          <p className="text-[10px] text-muted-foreground/70 text-center">
            सरदार वल्लभभाई पटेल प्रौद्योगिकी संस्थान
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}