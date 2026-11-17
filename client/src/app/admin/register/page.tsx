"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { getToken, setToken } from "@/lib/auth";
import { apiPost, ApiError } from "@/lib/api";
import type { ApiValidationIssue } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ArrowLeftIcon } from "@/components/ui/icons";

const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function validateRegister(
  email: string,
  password: string,
  confirmPassword: string
): RegisterErrors {
  const result = registerSchema.safeParse({
    email: email.trim(),
    password,
    confirmPassword,
  });

  if (result.success) {
    return {};
  }

  const errors: RegisterErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0] as keyof RegisterErrors;
    if (path === "email") {
      errors.email = issue.message;
    } else if (path === "password") {
      errors.password = issue.message;
    } else if (path === "confirmPassword") {
      errors.confirmPassword = issue.message;
    }
  }
  return errors;
}

export default function AdminRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (getToken()) {
      router.replace("/admin");
      return;
    }

    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [router]);

  const mapIssuesToFields = (issues: ApiValidationIssue[]): RegisterErrors => {
    const fieldErrors: RegisterErrors = {};
    for (const issue of issues) {
      if (issue.path === "email") {
        fieldErrors.email = issue.message;
      } else if (issue.path === "password") {
        fieldErrors.password = issue.message;
      }
    }
    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setEmailServerError(null);

    const fieldErrors = validateRegister(email, password, confirmPassword);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const data = await apiPost<{ token: string }>(
        "/api/auth/register",
        {
          email: email.trim(),
          password,
        },
        { auth: false }
      );

      if (data?.token) {
        setToken(data.token);
        router.push("/admin");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setEmailServerError(err.message);
        } else if (err.status === 429) {
          setServerError("Too many attempts. Please try again later.");
        } else if (err.status === 400 && err.issues) {
          const fieldErrors = mapIssuesToFields(err.issues);
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          } else {
            setServerError(err.message);
          }
        } else {
          setServerError(err.message);
        }
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-canvas">
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-muted hover:text-ink transition-colors gap-1.5"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to home
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Sign up to start building surveys.
            </CardDescription>
          </CardHeader>

          <CardBody>
            {serverError && (
              <div className="mb-5">
                <Alert variant="error">{serverError}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field
                id="email"
                label="Email address"
                required
                error={errors.email ?? emailServerError}
              >
                <Input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }
                    if (emailServerError) {
                      setEmailServerError(null);
                    }
                  }}
                  disabled={isLoading}
                />
              </Field>

              <Field
                id="password"
                label="Password"
                required
                error={errors.password}
              >
                <Input
                  id="password"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  disabled={isLoading}
                />
              </Field>

              <Field
                id="confirmPassword"
                label="Confirm password"
                required
                error={errors.confirmPassword}
              >
                <Input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  disabled={isLoading}
                />
              </Field>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Create account
                </Button>
              </div>
            </form>

            <p className="mt-4 text-center text-xs text-muted">
              Already have an account{" "}
              <Link
                href="/admin/login"
                className="font-medium text-primary hover:text-primary-hover transition-colors"
              >
                Log in
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
