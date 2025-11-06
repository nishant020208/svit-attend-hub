import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TopTabs } from "@/components/layout/TopTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Upload } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Papa from "papaparse";

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("STUDENT");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Parent-Student linking
  const [studentEmail, setStudentEmail] = useState("");
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  
  // Profile settings
  const [profileSettings, setProfileSettings] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
    gender: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

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

      // Load profile settings
      if (profileData) {
        setProfileSettings({
          firstName: profileData.first_name || "",
          lastName: profileData.last_name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
          dateOfBirth: profileData.date_of_birth || "",
          gender: profileData.gender || "",
        });
      }

      if (profileData?.role === "ADMIN") {
        fetchWhitelist();
      }

      if (profileData?.role === "PARENT") {
        fetchLinkedStudents();
      }
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("parent_student_relation")
        .select(`
          *,
          students (
            id,
            roll_number,
            course,
            section,
            year,
            profiles:user_id (name, email)
          )
        `)
        .eq("parent_id", user.id);

      if (error) throw error;
      setLinkedStudents(data || []);
    } catch (error: any) {
      console.error("Error fetching linked students:", error);
    }
  };

  const handleLinkStudent = async () => {
    if (!studentEmail) {
      toast({
        title: "Error",
        description: "Please enter student email",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find student by email
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", studentEmail)
        .eq("role", "STUDENT")
        .single();

      if (profileError || !profileData) {
        toast({
          title: "Error",
          description: "Student not found with this email",
          variant: "destructive",
        });
        return;
      }

      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", profileData.id)
        .single();

      if (studentError || !studentData) {
        toast({
          title: "Error",
          description: "Student record not found",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("parent_student_relation")
        .insert({
          parent_id: user.id,
          student_id: studentData.id,
          relation_type: "PARENT",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student linked successfully",
      });

      setStudentEmail("");
      fetchLinkedStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchWhitelist = async () => {
    try {
      const { data, error } = await supabase
        .from("whitelist")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWhitelist(data || []);
    } catch (error: any) {
      console.error("Error fetching whitelist:", error);
    }
  };

  const handleAddToWhitelist = async () => {
    if (!newEmail || !newName) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("whitelist")
        .insert([{
          email: newEmail,
          name: newName,
          role: newRole as "ADMIN" | "FACULTY" | "STUDENT",
          added_by: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User added to whitelist",
      });

      setNewEmail("");
      setNewName("");
      setNewRole("STUDENT");
      fetchWhitelist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromWhitelist = async (id: string) => {
    try {
      const { error } = await supabase
        .from("whitelist")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User removed from whitelist",
      });

      fetchWhitelist();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      complete: async (results) => {
        try {
          const records = results.data.map((row: any) => ({
            email: row.email,
            name: row.name,
            role: row.role || "STUDENT",
            added_by: user.id,
          })).filter(r => r.email && r.name);

          const { error } = await supabase
            .from("whitelist")
            .insert(records);

          if (error) throw error;

          toast({
            title: "Success",
            description: `${records.length} users added to whitelist`,
          });

          setCsvFile(null);
          fetchWhitelist();
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        }
      },
      error: (error) => {
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      },
    });
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profileSettings.firstName,
          last_name: profileSettings.lastName,
          phone: profileSettings.phone,
          address: profileSettings.address,
          date_of_birth: profileSettings.dateOfBirth,
          gender: profileSettings.gender,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  const handleContactUs = () => {
    window.location.href = "mailto:nishu0202081@gmail.com?subject=SVIT App Support";
  };

  const handleShareApp = () => {
    const apkUrl = window.location.origin + "/app-release.apk";
    const message = `Check out SVIT App for attendance and timetable management!\n\nDownload APK: ${apkUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: "SVIT App",
        text: message,
        url: apkUrl,
      }).catch((error) => {
        console.log("Share failed:", error);
        // Fallback to download
        window.open(apkUrl, '_blank');
      });
    } else {
      // Fallback to download
      const link = document.createElement('a');
      link.href = apkUrl;
      link.download = 'svit-app.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "APK file is being downloaded",
      });
    }
  };

  const handleAboutUs = () => {
    navigate("/about");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <TopTabs userEmail={user?.email} userName={profile?.name} userRole={profile?.role} />
      <main className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences</p>
          </div>
        </div>

        {/* Theme Toggle */}
        <Card className="mb-6 shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Choose your preferred theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm">Switch between Light, Dark, and Vibrant modes</p>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Profile Settings - Available to All Users */}
        <Card className="mb-6 shadow-lg border-primary/20">
          <CardHeader className="gradient-primary text-primary-foreground">
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription className="text-primary-foreground/80">Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First Name"
                  value={profileSettings.firstName}
                  onChange={(e) => setProfileSettings({ ...profileSettings, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last Name"
                  value={profileSettings.lastName}
                  onChange={(e) => setProfileSettings({ ...profileSettings, lastName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={profileSettings.email}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 XXXXXXXXXX"
                  value={profileSettings.phone}
                  onChange={(e) => setProfileSettings({ ...profileSettings, phone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Full Address"
                  value={profileSettings.address}
                  onChange={(e) => setProfileSettings({ ...profileSettings, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={profileSettings.dateOfBirth}
                  onChange={(e) => setProfileSettings({ ...profileSettings, dateOfBirth: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select value={profileSettings.gender} onValueChange={(value) => setProfileSettings({ ...profileSettings, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleUpdateProfile} className="mt-4 gradient-secondary">
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Admin Settings */}
        {profile?.role === "ADMIN" && (
          <>
            <Card className="mb-6 shadow-lg">
              <CardHeader className="gradient-secondary text-primary-foreground">
                <CardTitle>Add User to Whitelist</CardTitle>
                <CardDescription className="text-primary-foreground/80">Allow new users to register for the system</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@svit.ac.in"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Full Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="FACULTY">Teacher</SelectItem>
                        <SelectItem value="PARENT">Parent</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAddToWhitelist} className="mt-4 gradient-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Whitelist
                </Button>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-4">Bulk Upload (CSV)</h3>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    <Button onClick={handleCSVUpload} disabled={!csvFile} className="gradient-accent">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload CSV
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    CSV format: email, name, role (STUDENT/FACULTY/PARENT/ADMIN)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Whitelisted Users</CardTitle>
                <CardDescription>{whitelist.length} users whitelisted</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {whitelist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.email}</p>
                        <p className="text-xs text-primary font-semibold">{item.role}</p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveFromWhitelist(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {whitelist.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No whitelisted users</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Parent Settings */}
        {profile?.role === "PARENT" && (
          <Card className="shadow-lg">
            <CardHeader className="gradient-accent text-primary-foreground">
              <CardTitle>Link Student Account</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Enter student email to access their information
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-2 mb-6">
                <Input
                  type="email"
                  placeholder="student@svit.ac.in"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleLinkStudent} className="gradient-primary">
                  Link Student
                </Button>
              </div>

              {linkedStudents.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Linked Students</h3>
                  {linkedStudents.map((relation) => (
                    <div
                      key={relation.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{relation.students?.profiles?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {relation.students?.profiles?.email}
                        </p>
                        <p className="text-xs text-primary">
                          {relation.students?.course} - Year {relation.students?.year} - Section {relation.students?.section}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* App Section */}
        <div className="space-y-6 mt-8">
          <h2 className="text-xl font-semibold">App</h2>
          
          <Card className="shadow-lg border-primary/20 hover:shadow-xl transition-shadow cursor-pointer" onClick={handleShareApp}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Share App</h3>
                  <p className="text-sm text-muted-foreground">Share SVIT App with others</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/20 hover:shadow-xl transition-shadow cursor-pointer" onClick={handleAboutUs}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">About Us</h3>
                  <p className="text-sm text-muted-foreground">Learn about our institution</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/20 hover:shadow-xl transition-shadow cursor-pointer" onClick={handleContactUs}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Contact Us</h3>
                  <p className="text-sm text-muted-foreground">Get in touch with support</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
