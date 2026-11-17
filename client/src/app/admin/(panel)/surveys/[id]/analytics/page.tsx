"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { SurveyAnalytics, QuestionAnalytics } from "@/lib/types";
import { apiGet, ApiError } from "@/lib/api";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { QuestionAnalyticsCard } from "@/components/analytics";

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params?.id as string;

  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const initialized = useRef(false);

  const loadAnalytics = useCallback(
    async (version?: string) => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const url = version
          ? `/api/surveys/${surveyId}/analytics?version=${version}`
          : `/api/surveys/${surveyId}/analytics`;
        const data = await apiGet<SurveyAnalytics>(url, { auth: true });
        setAnalytics(data);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setNotFound(true);
          } else if (err.status === 400) {
            setError(`Invalid version: ${err.message}`);
          } else {
            setError(err.message || "Failed to load analytics");
          }
        } else {
          setError("Failed to load analytics");
        }
      } finally {
        setLoading(false);
      }
    },
    [surveyId]
  );

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadAnalytics();
    }
  }, [loadAnalytics]);

  // Build version options: numbered versions from 1 to current survey version
  const versionOptions = analytics
    ? Array.from({ length: analytics.survey.version }, (_, i) => i + 1)
    : [];

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedVersion(value);
    loadAnalytics(value || undefined);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Spinner size="md" />
          <p className="text-muted">Loading analytics…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody className="animate-pulse">
                <div className="h-4 bg-line rounded w-1/2 mb-3" />
                <div className="h-8 bg-line rounded w-1/3" />
              </CardBody>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardBody className="animate-pulse">
                <div className="h-5 bg-line rounded w-1/3 mb-4" />
                <div className="h-4 bg-line rounded w-2/3 mb-2" />
                <div className="h-4 bg-line rounded w-1/2" />
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Not found
  if (notFound) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-primary hover:text-primary-hover text-sm">
            ← Back to surveys
          </Link>
        </div>
        <Card>
          <CardBody className="text-center py-16">
            <h1 className="text-2xl font-bold text-ink mb-2">
              Survey not found
            </h1>
            <p className="text-muted mb-6">
              The survey you&apos;re looking for does not exist or has been deleted.
            </p>
            <Button variant="secondary" size="md" onClick={() => router.push("/admin")}>
              Back to surveys
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-primary hover:text-primary-hover text-sm">
            ← Back to surveys
          </Link>
        </div>
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" size="md" onClick={() => loadAnalytics(selectedVersion || undefined)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!analytics) return null;

  const { survey, totalResponses, questions } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin" className="text-primary hover:text-primary-hover text-sm">
              ← Back to surveys
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-ink">{survey.title}</h1>
        </div>
        {versionOptions.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="version-select" className="text-sm text-muted">
              Version
            </label>
            <Select
              id="version-select"
              value={selectedVersion}
              onChange={handleVersionChange}
              className="w-48"
            >
              <option value="">All versions (v{survey.version})</option>
              {versionOptions.map((v) => (
                <option key={v} value={String(v)}>
                  Version {v}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Error alert (when analytics exists but there&apos;s also an error) */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm text-muted mb-1">Total Responses</p>
            <p className="text-3xl font-bold text-ink">{totalResponses}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-muted mb-1">
              {selectedVersion ? "Version" : "Survey Version"}
            </p>
            <p className="text-3xl font-bold text-ink">
              {selectedVersion ? Number(selectedVersion) : survey.version}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-muted mb-1">Questions</p>
            <p className="text-3xl font-bold text-ink">{questions.length}</p>
          </CardBody>
        </Card>
      </div>

      {/* Empty state */}
      {totalResponses === 0 && (
        <Card>
          <CardBody className="text-center py-16">
            <svg
              className="w-12 h-12 mx-auto text-line mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                d="M9 17v-2m3 2v-4m3 4v-6m2 6a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="text-xl font-semibold text-ink mb-2">
              No responses yet
            </h2>
            <p className="text-muted max-w-md mx-auto">
              Once people start submitting this survey, their responses will
              appear here with detailed analytics for each question.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Per-question analytics */}
      {questions.map((q) => (
        <QuestionAnalyticsCard
          key={q.id}
          question={q as QuestionAnalytics}
          totalResponses={totalResponses}
        />
      ))}
    </div>
  );
}
