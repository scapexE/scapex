import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ClientLoginProps {
  onLogin: () => void;
}

export function ClientLogin({ onLogin }: ClientLoginProps) {
  const { t, dir } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("client@neom.com");
  const [password, setPassword] = useState("password123");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4" dir={dir}>
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-3xl">S</span>
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {dir === 'rtl' ? "بوابة عملاء سكيب" : "SCAPE Client Portal"}
            </CardTitle>
            <CardDescription>
              {dir === 'rtl' 
                ? "سجل دخولك لمتابعة مشاريعك وعقودك" 
                : "Sign in to track your projects and contracts"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className={dir === 'rtl' ? "text-right block" : ""}>
                {dir === 'rtl' ? "البريد الإلكتروني" : "Email Address"}
              </Label>
              <div className="relative">
                <Building2 className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                  dir === 'rtl' ? "right-3" : "left-3"
                )} />
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "bg-secondary/50",
                    dir === 'rtl' ? "pr-9 text-right" : "pl-9"
                  )} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">
                  {dir === 'rtl' ? "كلمة المرور" : "Password"}
                </Label>
                <Button variant="link" className="p-0 h-auto text-xs text-primary font-normal">
                  {dir === 'rtl' ? "نسيت كلمة المرور؟" : "Forgot password?"}
                </Button>
              </div>
              <div className="relative">
                <Lock className={cn(
                  "absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground",
                  dir === 'rtl' ? "right-3" : "left-3"
                )} />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "bg-secondary/50",
                    dir === 'rtl' ? "pr-9 text-right" : "pl-9"
                  )} 
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground",
                    dir === 'rtl' ? "left-1" : "right-1"
                  )}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <Button type="submit" className="w-full h-11 text-base font-medium mt-6">
              {dir === 'rtl' ? "تسجيل الدخول" : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/50 pt-6">
          <p className="text-sm text-muted-foreground">
            {dir === 'rtl' 
              ? "ليس لديك حساب؟ " 
              : "Don't have an account? "}
            <Button variant="link" className="p-0 h-auto font-medium">
              {dir === 'rtl' ? "تواصل مع المبيعات" : "Contact Sales"}
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
