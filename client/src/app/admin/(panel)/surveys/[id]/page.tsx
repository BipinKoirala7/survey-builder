"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import type { Survey } from "@/lib/types";
import { apiGet, ApiError } from "@/lib/api";
import { SurveyBuilder } from "@/components/builder/survey-builder";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { ButtonLink, Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "@/components/ui/icons";

export default function EditSurveyPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string | undefined);

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [is404, setIs404] = useState<boolean>(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setIs404(false);
    setReloadTrigger((v) => v + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function fetchSurvey() {
      if (!id) {
        setIs404(true);
        setLoading(false);
        return;
      }

      try {
        const data = await apiGet<Survey>(`/api/surveys/${id}`, { auth: true });
        if (!ignore) {
          setSurvey(data);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiError && err.status === 404) {
            setIs404(true);
          } else if (err instanceof Error) {
            setError(err.message || "Failed to load survey");
          } else {
            setError("An unexpected error occurred while loading the survey.");
          }
          setLoading(false);
        }
      }
    }

    fetchSurvey();

    return () => {
      ignore = true;
    };
  }, [id, reloadTrigger]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" className="text-primary" />
        <p className="text-sm text-muted">Loading survey...</p>
      </div>
    );
  }

  if (is404) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center bg-surface border border-line rounded-xl p-8 space-y-4 shadow-xs">
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-ink">Survey Not Found</h2>
          <p className="text-sm text-muted">
            The survey you are trying to edit does not exist or may have been deleted.
          </p>
        </div>
        <div className="pt-2">
          <ButtonLink href="/admin" variant="primary">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Surveys
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 space-y-4">
        <Alert
          variant="error"
          title="Error Loading Survey"
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={retry}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        <div className="text-center">
          <ButtonLink href="/admin" variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Surveys
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  return <SurveyBuilder initialSurvey={survey} isNew={false} />;
}
