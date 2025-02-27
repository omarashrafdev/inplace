import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert, AlertTitle } from '@/components/ui/alert';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { User } from '@/lib/types';
import { Logo } from '@/components/Logo';

const formSchema = z.object({
  email: z.string().min(2, 'Email is required').email(),
  password: z.string().min(1, 'Password is required')
});

export function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) return navigate('/');
  }, [navigate, user]);

  const [loginErr, setLoginErr] = useState<string | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginErr(null);
    fetch(import.meta.env.VITE_API_URL + '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: values.email,
        password: values.password
      })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          setLoginErr(data.message);
        }

        if (data.accessToken) {
          const user: User = {
            id: data.user.id,
            first_name: data.user.first_name,
            last_name: data.user.last_name,
            phone_number: data.user.phone_number,
            bio: data.user.bio,
            email: data.user.email,
            verified: data.user.verified,
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt
          };
          login({ user: user, accessToken: data.accessToken, refreshToken: data.refreshToken });
          return navigate('/');
        }
      });
  }

  return (
    <Card className=" w-[350px] md:w-[450px] mx-auto mt-10 sm:mt-20 ">
      <CardHeader>
        <Logo className="w-64 mx-auto my-10" />
        <CardTitle className="pb-4">Login</CardTitle>
        {loginErr && (
          <Alert variant="destructive">
            <AlertTitle>{loginErr}</AlertTitle>
          </Alert>
        )}
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between mb-1">
              <Label asChild>
                <div className="flex gap-2">
                  <p>New to Inplace? </p>
                  <Link className="hover:underline" to="/register">
                    Register
                  </Link>
                </div>
              </Label>
              <Label asChild className="hidden">
                <Link to="/forgot-password">Forgot Password ?</Link>
              </Label>
            </div>

            <Button className="w-full" type="submit">
              Login
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
