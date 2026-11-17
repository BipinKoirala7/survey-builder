"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { SurveyListItem } from "@/lib/types";
import { apiGet, apiDelete, ApiError } from "@/lib/api";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import {
  PlusIcon,
  EditIcon,
  ChartIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
} from "@/components/ui/icons";

export default function AdminSurveysPage() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [surveyToDelete, setSurveyToDelete] = useState<SurveyListItem | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchSurveys = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<SurveyListItem[]>("/api/surveys", {
        auth: true,
      });
      setSurveys(data || []);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load surveys.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    apiGet<SurveyListItem[]>("/api/surveys", { auth: true })
      .then((data) => {
        if (isMounted) {
          setSurveys(data || []);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Failed to load surveys.");
          }
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyLink = async (surveyId: string) => {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/s/${surveyId}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(surveyId);
      setTimeout(() => {
        setCopiedId((current) => (current === surveyId ? null : current));
      }, 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDeleteConfirm = async () => {
    if (!surveyToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiDelete(`/api/surveys/${surveyToDelete._id}`, { auth: true });
      setSurveys((prev) => prev.filter((s) => s._id !== surveyToDelete._id));
      setSuccessMessage(
        `Survey "${surveyToDelete.title}" was deleted successfully.`
      );
      setSurveyToDelete(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("Failed to delete the survey.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Surveys</h1>
          <p className="text-sm text-muted mt-1">
            Create, manage, and analyze your surveys.
          </p>
        </div>
        <ButtonLink
          href="/admin/surveys/new"
          variant="primary"
          size="md"
          className="self-start sm:self-auto gap-1.5"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New survey</span>
        </ButtonLink>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <Alert
          variant="success"
          onClose={() => setSuccessMessage(null)}
          className="animate-in fade-in duration-200"
        >
          {successMessage}
        </Alert>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <Alert
          variant="error"
          title="Error loading surveys"
          action={
            <Button variant="secondary" size="sm" onClick={fetchSurveys}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="hidden md:block">
            <Card>
              <div className="p-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-line/60 last:border-0 animate-pulse"
                  >
                    <div className="space-y-2 w-1/3">
                      <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
                      <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                    </div>
                    <div className="h-5 bg-slate-200 rounded-full w-16"></div>
                    <div className="h-4 bg-slate-200 rounded-md w-8"></div>
                    <div className="h-4 bg-slate-200 rounded-md w-8"></div>
                    <div className="h-4 bg-slate-200 rounded-md w-24"></div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-slate-200 rounded-md w-16"></div>
                      <div className="h-8 bg-slate-200 rounded-md w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="md:hidden space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardBody className="space-y-3 animate-pulse">
                  <div className="h-5 bg-slate-200 rounded-md w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                  <div className="flex gap-4 pt-2">
                    <div className="h-4 bg-slate-200 rounded-md w-16"></div>
                    <div className="h-4 bg-slate-200 rounded-md w-20"></div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && surveys.length === 0 && (
        <Card className="text-center py-16 px-4">
          <div className="max-w-sm mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center mx-auto">
              <PlusIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">No surveys yet</h3>
              <p className="text-sm text-muted mt-1">
                Create your first survey to start collecting responses and analyzing results.
              </p>
            </div>
            <div className="pt-2">
              <ButtonLink
                href="/admin/surveys/new"
                variant="primary"
                size="md"
                className="gap-1.5"
              >
                <PlusIcon className="w-4 h-4" />
                <span>New survey</span>
              </ButtonLink>
            </div>
          </div>
        </Card>
      )}

      {/* Survey List Table & Cards */}
      {!loading && !error && surveys.length > 0 && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-canvas/50 border-b border-line text-xs font-semibold text-muted uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">
                        Title
                      </th>
                      <th scope="col" className="px-6 py-3.5">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3.5">
                        Version
                      </th>
                      <th scope="col" className="px-6 py-3.5">
                        Responses
                      </th>
                      <th scope="col" className="px-6 py-3.5">
                        Updated
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {surveys.map((survey) => (
                      <tr
                        key={survey._id}
                        className="hover:bg-canvas/40 transition-colors"
                      >
                        <td className="px-6 py-4 max-w-xs">
                          <Link
                            href={`/admin/surveys/${survey._id}`}
                            className="font-medium text-ink hover:text-primary transition-colors block"
                          >
                            {survey.title}
                          </Link>
                          {survey.description ? (
                            <p className="text-xs text-muted truncate mt-0.5">
                              {survey.description}
                            </p>
                          ) : (
                            <span className="text-xs text-muted/60 italic mt-0.5 block">
                              No description
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={
                              survey.status === "published"
                                ? "success"
                                : "neutral"
                            }
                          >
                            {survey.status === "published"
                              ? "Published"
                              : "Draft"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted font-mono text-xs">
                          v{survey.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-ink font-medium">
                          {survey.responseCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted text-xs">
                          {formatDate(survey.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <ButtonLink
                              href={`/admin/surveys/${survey._id}`}
                              variant="secondary"
                              size="sm"
                              className="gap-1"
                              title="Edit survey"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </ButtonLink>

                            <ButtonLink
                              href={`/admin/surveys/${survey._id}/analytics`}
                              variant="secondary"
                              size="sm"
                              className="gap-1"
                              title="View analytics"
                            >
                              <ChartIcon className="w-3.5 h-3.5" />
                              <span>Analytics</span>
                            </ButtonLink>

                            {survey.status === "published" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCopyLink(survey._id)}
                                className="gap-1"
                                title="Copy public survey link"
                              >
                                {copiedId === survey._id ? (
                                  <>
                                    <CheckIcon className="w-3.5 h-3.5 text-success" />
                                    <span className="text-success font-medium">
                                      Copied
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <CopyIcon className="w-3.5 h-3.5" />
                                    <span>Copy link</span>
                                  </>
                                )}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteError(null);
                                setSurveyToDelete(survey);
                              }}
                              className="text-danger hover:bg-red-50 hover:text-danger p-2"
                              title="Delete survey"
                              aria-label={`Delete ${survey.title}`}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="md:hidden space-y-4">
            {surveys.map((survey) => (
              <Card key={survey._id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/surveys/${survey._id}`}
                      className="font-medium text-ink hover:text-primary transition-colors block text-base"
                    >
                      {survey.title}
                    </Link>
                    {survey.description && (
                      <p className="text-xs text-muted line-clamp-2 mt-1">
                        {survey.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      survey.status === "published" ? "success" : "neutral"
                    }
                  >
                    {survey.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </CardHeader>

                <CardBody className="pt-0 space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-xs py-2 border-y border-line text-muted">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted/70">
                        Version
                      </span>
                      <span className="font-mono text-ink">v{survey.version}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted/70">
                        Responses
                      </span>
                      <span className="font-medium text-ink">
                        {survey.responseCount}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-muted/70">
                        Updated
                      </span>
                      <span>{formatDate(survey.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <ButtonLink
                      href={`/admin/surveys/${survey._id}`}
                      variant="secondary"
                      size="sm"
                      className="gap-1 flex-1 min-w-[90px] justify-center"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </ButtonLink>

                    <ButtonLink
                      href={`/admin/surveys/${survey._id}/analytics`}
                      variant="secondary"
                      size="sm"
                      className="gap-1 flex-1 min-w-[90px] justify-center"
                    >
                      <ChartIcon className="w-3.5 h-3.5" />
                      <span>Analytics</span>
                    </ButtonLink>

                    {survey.status === "published" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyLink(survey._id)}
                        className="gap-1 flex-1 min-w-[100px] justify-center"
                      >
                        {copiedId === survey._id ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 text-success" />
                            <span className="text-success font-medium">
                              Copied
                            </span>
                          </>
                        ) : (
                          <>
                            <CopyIcon className="w-3.5 h-3.5" />
                            <span>Copy link</span>
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteError(null);
                        setSurveyToDelete(survey);
                      }}
                      className="text-danger hover:bg-red-50 hover:text-danger px-3 py-1.5"
                      title="Delete survey"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={surveyToDelete !== null}
        onClose={() => {
          if (!isDeleting) {
            setSurveyToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete survey"
        description="This action cannot be undone."
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setSurveyToDelete(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              loading={isDeleting}
              onClick={handleDeleteConfirm}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError && <Alert variant="error">{deleteError}</Alert>}
          <p className="text-sm text-ink leading-relaxed">
            Delete this survey and its{" "}
            <strong>
              {surveyToDelete?.responseCount}{" "}
              {surveyToDelete?.responseCount === 1 ? "response" : "responses"}
            </strong>
            ? This cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}
