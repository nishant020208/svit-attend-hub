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
import { Loader2, GraduationCap, User, Users, Shield } from "lucide-react";
import svitLogo from "@/assets/svit-logo-official.jpg";
import { ForgotPassword } from "./ForgotPassword";

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

export function RoleBasedAuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("STUDENT");
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
      color: "text-blue-600",
    },
    FACULTY: {
      icon: User,
      title: "Faculty Portal",
      description: "Manage classes, mark attendance, and grade students",
      color: "text-green-600",
    },
    PARENT: {
      icon: Users,
      title: "Parent Portal",
      description: "Monitor your child's academic progress",
      color: "text-purple-600",
    },
    ADMIN: {
      icon: Shield,
      title: "Admin Portal",
      description: "Manage system settings and users",
      color: "text-red-600",
    },
  };

  const currentRoleConfig = roleConfig[selectedRole as keyof typeof roleConfig];
  const RoleIcon = currentRoleConfig.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <img src={svitLogo} alt="SVIT Logo" className="h-24 w-24 object-contain" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">SVIT ERP System</CardTitle>
            <CardDescription className="text-base">Sardar Vallabhbhai Patel Institute of Technology</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Role Selection Tabs */}
          <Tabs value={selectedRole} onValueChange={setSelectedRole} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="STUDENT" className="flex flex-col items-center gap-1 py-3">
                <GraduationCap className="h-5 w-5" />
                <span className="text-xs">Student</span>
              </TabsTrigger>
              <TabsTrigger value="FACULTY" className="flex flex-col items-center gap-1 py-3">
                <User className="h-5 w-5" />
                <span className="text-xs">Teacher</span>
              </TabsTrigger>
              <TabsTrigger value="PARENT" className="flex flex-col items-center gap-1 py-3">
                <Users className="h-5 w-5" />
                <span className="text-xs">Parent</span>
              </TabsTrigger>
              <TabsTrigger value="ADMIN" className="flex flex-col items-center gap-1 py-3">
                <Shield className="h-5 w-5" />
                <span className="text-xs">Admin</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Role Info Card */}
          <div className="mb-6 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <RoleIcon className={`h-8 w-8 ${currentRoleConfig.color}`} />
              <div>
                <h3 className="font-semibold text-lg">{currentRoleConfig.title}</h3>
                <p className="text-sm text-muted-foreground">{currentRoleConfig.description}</p>
              </div>
            </div>
          </div>

          {/* Login/Signup Tabs */}
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={`${selectedRole.toLowerCase()}@svit.ac.in`}
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    {...loginForm.register("password")}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <ForgotPassword />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Log In as {selectedRole}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={`${selectedRole.toLowerCase()}@svit.ac.in`}
                    {...signupForm.register("email")}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    {...signupForm.register("password")}
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    {...signupForm.register("confirmPassword")}
                  />
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign Up as {selectedRole}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Note: Only whitelisted {selectedRole.toLowerCase()}s can register. Contact administrator for access.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground flex-col gap-2">
          <p className="w-full">© {new Date().getFullYear()} Sardar Vallabhbhai Patel Institute of Technology</p>
          <p className="w-full text-[10px]">सर्वज्ञां वल्लभाई पटेल प्रौद्योगिकी संस्थान</p>
        </CardFooter>
      </Card>
    </div>
  );
}
