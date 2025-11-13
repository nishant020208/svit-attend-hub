import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calendar, GraduationCap, BookOpen, Phone, Mail, Globe } from "lucide-react";
export default function AboutUs() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      const {
        data: profileData
      } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setProfile(profileData);
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-4 md:p-6 max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-premium">
              <Building2 className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent mb-2">
            Sarvajanik Vidyalaya Institute of Technology
          </h1>
          <p className="text-sm text-muted-foreground">( Version 1.0.23 )</p>
        </div>

        {/* Sapphire Software Solution Card */}
        <Card className="mb-6 shadow-premium border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-secondary flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">NISHATT SOFTWARE  </h2>
                <p className="text-sm text-muted-foreground">Software Solutions Provider</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-foreground leading-relaxed">
                
              <br />
                Nr. Gujarat High Court, S.G.Highway,<br />
                Ahmedabad-380060, Gujarat, India.
              </p>

              <div className="flex items-center gap-2 text-primary">
                <Phone className="w-4 h-4" />
                <span className="font-medium">Contact No.:</span>
                <span>7862859996(only for technical assistance)</span>
              </div>

              <div className="flex items-center gap-2 text-primary">
                <Mail className="w-4 h-4" />
                <span className="font-medium">E-mail:</span>
                <a href="mailto:support@vidyalayaschoolsoftware.com" className="hover:underline">nishu0202081@gmail.com</a>
              </div>

              
            </div>
          </CardContent>
        </Card>

        {/* Requirements Card */}
        <Card className="mb-6 shadow-premium border-primary/20 hover-scale transition-smooth animate-fade-in">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Requirements:
            </h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Android device with proper internet connection.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Android and iOS version : Check on Google Play Store and App store.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Web View should be Updated.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Google Play Services should be Updated.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Password : Get it from School Side.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Proper Permission for access Modules.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Need PDF Reader Application in Device.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Organization Info */}
        <Card className="shadow-premium border-primary/20">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              About Our Institution
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">sardar vallabhbhai patel institute of technology          </p>
                  <p className="text-muted-foreground">HARNI, VADODARA</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Academic Year</p>
                  <p className="text-muted-foreground">2025-26</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>;
}