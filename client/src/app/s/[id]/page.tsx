import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { SurveyForm } from "@/components/survey";

export default function PublicSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <Spinner size="lg" aria-label="Loading" />
        </div>
      }
    >
      <SurveyLoader params={params} />
    </Suspense>
  );
}

async function SurveyLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SurveyForm surveyId={id} />;
}
