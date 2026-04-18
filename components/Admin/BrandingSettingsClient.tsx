// components/Admin/BrandingSettingsClient.tsx
"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  FormEvent,
  ChangeEvent,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { validateBrandColors } from "@/lib/theme";

type PortalSettings = {
  id: number;
  city_name: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  hero_message: string | null;
  seal_url: string | null;

  story_city_description: string | null;
  story_year_achievements: string | null;
  story_capital_projects: string | null;

  leader_name: string | null;
  leader_title: string | null;
  leader_message: string | null;
  leader_photo_url: string | null;

  project1_title: string | null;
  project1_summary: string | null;
  project2_title: string | null;
  project2_summary: string | null;
  project3_title: string | null;
  project3_summary: string | null;

  project1_image_url: string | null;
  project2_image_url: string | null;
  project3_image_url: string | null;

  stat_population: string | null;
  stat_employees: string | null;
  stat_square_miles: string | null;

  // toggles
  show_leadership: boolean | null;
  show_story: boolean | null;
  show_year_review: boolean | null;
  show_capital_projects: boolean | null;
  show_stats: boolean | null;
  show_projects: boolean | null;

  // feature flags
  enable_budget: boolean | null;
  enable_actuals: boolean | null;
  enable_transactions: boolean | null;
  enable_vendors: boolean | null;
  enable_revenues: boolean | null;

  // fiscal year config
  fiscal_year_start_month: number | null;
  fiscal_year_start_day: number | null;
  fiscal_year_label: string | null;

  // publish state
  is_published: boolean | null;
};

type ProjectTitleKey = "project1_title" | "project2_title" | "project3_title";
type ProjectSummaryKey =
  | "project1_summary"
  | "project2_summary"
  | "project3_summary";

const PROJECT_TITLE_KEYS: ProjectTitleKey[] = [
  "project1_title",
  "project2_title",
  "project3_title",
];

const PROJECT_SUMMARY_KEYS: ProjectSummaryKey[] = [
  "project1_summary",
  "project2_summary",
  "project3_summary",
];

const PROJECT_IMAGE_KEYS = [
  "project1_image_url",
  "project2_image_url",
  "project3_image_url",
] as const;

type ProjectImageKey = (typeof PROJECT_IMAGE_KEYS)[number];

type LoadState = "idle" | "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "saved" | "error";

type ThemePreset = {
  id: string;
  name: string;
  primary: string;
  accent: string;
  background: string;
};

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "slate-authority",
    name: "Slate Authority",
    primary: "#1e293b",
    accent: "#0891b2",
    background: "#0f172a",
  },
  {
    id: "forest-trust",
    name: "Forest Trust",
    primary: "#14532d",
    accent: "#0d9488",
    background: "#052e16",
  },
  {
    id: "civic-warmth",
    name: "Civic Warmth",
    primary: "#78350f",
    accent: "#ca8a04",
    background: "#292524",
  },
  {
    id: "ocean-depth",
    name: "Ocean Depth",
    primary: "#0c4a6e",
    accent: "#0ea5e9",
    background: "#082f49",
  },
];

const SELECT_FIELDS = [
  "id",
  "city_name",
  "tagline",
  "primary_color",
  "accent_color",
  "background_color",
  "logo_url",
  "hero_image_url",
  "hero_message",
  "seal_url",
  "story_city_description",
  "story_year_achievements",
  "story_capital_projects",
  "leader_name",
  "leader_title",
  "leader_message",
  "leader_photo_url",
  "project1_title",
  "project1_summary",
  "project2_title",
  "project2_summary",
  "project3_title",
  "project3_summary",
  "project1_image_url",
  "project2_image_url",
  "project3_image_url",
  "stat_population",
  "stat_employees",
  "stat_square_miles",
  "show_leadership",
  "show_story",
  "show_year_review",
  "show_capital_projects",
  "show_stats",
  "show_projects",
  "is_published",
  "enable_budget",
  "enable_actuals",
  "enable_transactions",
  "enable_vendors",
  "enable_revenues",
  "fiscal_year_start_month",
  "fiscal_year_start_day",
  "fiscal_year_label",
  "is_published",
].join(", ");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Collapsible Section Component
function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <div className="px-4 pb-4 pt-2 border-t border-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
}

// Auto-resizing Textarea Component
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 2,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    
    // Calculate minimum height based on minRows
    const lineHeight = 20; // approximate line height in pixels
    const padding = 16; // py-2 = 8px top + 8px bottom
    const minHeight = (minRows * lineHeight) + padding;
    
    // Set to the larger of scrollHeight or minHeight
    const newHeight = Math.max(textarea.scrollHeight, minHeight);
    textarea.style.height = `${newHeight}px`;
  }, [minRows]);

  // Adjust height on value change
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Adjust height on mount
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e);
        adjustHeight();
      }}
      placeholder={placeholder}
      className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none overflow-hidden ${className ?? ""}`}
      style={{ minHeight: `${(minRows * 20) + 16}px` }}
    />
  );
}

export default function BrandingSettingsClient() {
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Upload states for each image type
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const [uploadingLeader, setUploadingLeader] = useState(false);
  const [uploadingProject, setUploadingProject] = useState<number | null>(null);

  // Color validation warnings
  const [colorWarnings, setColorWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setMessage(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setLoadState("error");
        setMessage(
          "You must be signed in as an admin to view portal settings."
        );
        return;
      }

      try {
        const { data, error } = await supabase
          .from("portal_settings")
          .select(SELECT_FIELDS)
          .single();

        if (error) {
          if (
            error.code === "PGRST116" ||
            error.message?.includes("0 rows")
          ) {
            const { data: inserted, error: insertError } = await supabase
              .from("portal_settings")
              .insert({
                city_name: "Your Gov Name",
                tagline: "Transparent Budget. Empowered Citizens.",
                primary_color: "#0F172A",
                accent_color: "#0f766e",
                background_color: "#020617",
                logo_url: null,
                hero_image_url: null,
                hero_message:
                  "Use this space to introduce your transparency portal.",
                seal_url: null,
                story_city_description: null,
                story_year_achievements: null,
                story_capital_projects: null,
                leader_name: null,
                leader_title: null,
                leader_message: null,
                leader_photo_url: null,
                project1_title: null,
                project1_summary: null,
                project2_title: null,
                project2_summary: null,
                project3_title: null,
                project3_summary: null,
                project1_image_url: null,
                project2_image_url: null,
                project3_image_url: null,
                stat_population: null,
                stat_employees: null,
                stat_square_miles: null,
                show_leadership: true,
                show_story: true,
                show_year_review: true,
                show_capital_projects: true,
                show_stats: true,
                show_projects: true,
                enable_budget: true,
                enable_actuals: true,
                enable_transactions: false,
                enable_vendors: false,
                enable_revenues: false,
                fiscal_year_start_month: 1,
                fiscal_year_start_day: 1,
                fiscal_year_label: null,
                is_published: false,
              })
              .select(SELECT_FIELDS)
              .single();

            if (insertError || !inserted) {
              console.error(
                "BrandingSettings: insert default row error",
                insertError
              );
              setLoadState("error");
              setMessage(
                "Could not initialize portal settings row. Please try again or contact support."
              );
              return;
            }

            setSettings(inserted as unknown as PortalSettings);
            setLoadState("ready");
            setDirty(false);
            return;
          }

          console.error("BrandingSettings: load error", error);
          setLoadState("error");
          setMessage(
            "Could not load portal settings. Please try again or contact support."
          );
          return;
        }

        if (!data) {
          setLoadState("error");
          setMessage("No portal settings row found.");
          return;
        }

        if (!cancelled) {
          setSettings(data as unknown as PortalSettings);
          setLoadState("ready");
          setDirty(false);
        }
      } catch (err: unknown) {
        console.error("BrandingSettings: unexpected load error", err);
        if (!cancelled) {
          setLoadState("error");
          setMessage("Unexpected error loading branding settings.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (saveState === "saved") {
      const t = setTimeout(() => {
        setSaveState("idle");
        setMessage(null);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [saveState]);

  useEffect(() => {
    if (!settings) return;

    const result = validateBrandColors(
      settings.primary_color,
      settings.accent_color,
      settings.background_color
    );

    setColorWarnings(result.warnings);
  }, [
    settings?.primary_color,
    settings?.accent_color,
    settings?.background_color,
  ]);

  function handleFieldChange<K extends keyof PortalSettings>(
    key: K,
    value: PortalSettings[K]
  ) {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: value,
    });
    setDirty(true);
  }

  async function uploadImageToBucket(
    file: File,
    prefix: "logos" | "heroes" | "seals" | "leaders" | "projects"
  ): Promise<string> {
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.\-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const path = `${prefix}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("BrandingSettings: upload error", uploadError);
      throw new Error(
        uploadError.message ||
          "Could not upload image. Please try a smaller file."
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("branding").getPublicUrl(path);

    if (!publicUrl) {
      throw new Error("Upload succeeded but no URL returned.");
    }

    return publicUrl;
  }

  function validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) {
      return `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`;
    }
    return null;
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      return;
    }

    setUploadingLogo(true);
    setImageError(null);

    try {
      const url = await uploadImageToBucket(file, "logos");
      setSettings({ ...settings, logo_url: url });
      setDirty(true);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function handleHeroUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      return;
    }

    setUploadingHero(true);
    setImageError(null);

    try {
      const url = await uploadImageToBucket(file, "heroes");
      setSettings({ ...settings, hero_image_url: url });
      setDirty(true);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload hero image");
    } finally {
      setUploadingHero(false);
      e.target.value = "";
    }
  }

  async function handleSealUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      return;
    }

    setUploadingSeal(true);
    setImageError(null);

    try {
      const url = await uploadImageToBucket(file, "seals");
      setSettings({ ...settings, seal_url: url });
      setDirty(true);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload seal");
    } finally {
      setUploadingSeal(false);
      e.target.value = "";
    }
  }

  async function handleLeaderUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      return;
    }

    setUploadingLeader(true);
    setImageError(null);

    try {
      const url = await uploadImageToBucket(file, "leaders");
      setSettings({ ...settings, leader_photo_url: url });
      setDirty(true);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload leader photo");
    } finally {
      setUploadingLeader(false);
      e.target.value = "";
    }
  }

  async function handleProjectUpload(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    const error = validateFile(file);
    if (error) {
      setImageError(error);
      return;
    }

    setUploadingProject(index);
    setImageError(null);

    try {
      const url = await uploadImageToBucket(file, "projects");
      const imageKey = PROJECT_IMAGE_KEYS[index];
      setSettings({ ...settings, [imageKey]: url });
      setDirty(true);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Failed to upload project image");
    } finally {
      setUploadingProject(null);
      e.target.value = "";
    }
  }

  function handleDeleteLogo() {
    if (!settings) return;
    setSettings({ ...settings, logo_url: null });
    setDirty(true);
  }

  function handleDeleteHero() {
    if (!settings) return;
    setSettings({ ...settings, hero_image_url: null });
    setDirty(true);
  }

  function handleDeleteSeal() {
    if (!settings) return;
    setSettings({ ...settings, seal_url: null });
    setDirty(true);
  }

  function handleDeleteLeader() {
    if (!settings) return;
    setSettings({ ...settings, leader_photo_url: null });
    setDirty(true);
  }

  function handleDeleteProject(index: number) {
    if (!settings) return;
    const imageKey = PROJECT_IMAGE_KEYS[index];
    setSettings({ ...settings, [imageKey]: null });
    setDirty(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setSaveState("saving");
    setMessage(null);
    setImageError(null);

    try {
      const colorValidation = validateBrandColors(
        settings.primary_color,
        settings.accent_color,
        settings.background_color
      );
      const { correctedColors } = colorValidation;

      const { data, error } = await supabase
        .from("portal_settings")
        .update({
          city_name: settings.city_name,
          tagline: settings.tagline,
          primary_color: correctedColors.primary,
          accent_color: correctedColors.accent,
          background_color: correctedColors.surface,
          logo_url: settings.logo_url,
          hero_image_url: settings.hero_image_url,
          hero_message: settings.hero_message,
          seal_url: settings.seal_url,
          story_city_description: settings.story_city_description,
          story_year_achievements: settings.story_year_achievements,
          story_capital_projects: settings.story_capital_projects,
          leader_name: settings.leader_name,
          leader_title: settings.leader_title,
          leader_message: settings.leader_message,
          leader_photo_url: settings.leader_photo_url,
          project1_title: settings.project1_title,
          project1_summary: settings.project1_summary,
          project2_title: settings.project2_title,
          project2_summary: settings.project2_summary,
          project3_title: settings.project3_title,
          project3_summary: settings.project3_summary,
          project1_image_url: settings.project1_image_url,
          project2_image_url: settings.project2_image_url,
          project3_image_url: settings.project3_image_url,
          stat_population: settings.stat_population,
          stat_employees: settings.stat_employees,
          stat_square_miles: settings.stat_square_miles,
          show_leadership: settings.show_leadership,
          show_story: settings.show_story,
          show_year_review: settings.show_year_review,
          show_capital_projects: settings.show_capital_projects,
          show_stats: settings.show_stats,
          show_projects: settings.show_projects,
          enable_budget: settings.enable_budget ?? true,
          enable_actuals: settings.enable_actuals ?? true,
          enable_transactions: settings.enable_transactions ?? false,
          enable_vendors:
            settings.enable_transactions === false
              ? false
              : settings.enable_vendors ?? false,
          enable_revenues: settings.enable_revenues ?? false,
          fiscal_year_start_month:
            settings.fiscal_year_start_month ?? 1,
          fiscal_year_start_day:
            settings.fiscal_year_start_day ?? 1,
          fiscal_year_label:
            settings.fiscal_year_label &&
            settings.fiscal_year_label.trim().length > 0
              ? settings.fiscal_year_label.trim()
              : null,
          is_published: settings.is_published ?? false,
          budget_document_url: settings.budget_document_url?.trim() || null,
          methodology_data_source: settings.methodology_data_source?.trim() || null,
          methodology_accounting_basis: settings.methodology_accounting_basis?.trim() || null,
          methodology_update_schedule: settings.methodology_update_schedule?.trim() || null,
          methodology_exclusions: settings.methodology_exclusions?.trim() || null,
          methodology_audit_status: settings.methodology_audit_status?.trim() || null,
          feedback_notification_email: settings.feedback_notification_email?.trim() || null,
        })
        .eq("id", settings.id)
        .select(SELECT_FIELDS)
        .single();

      if (error || !data) {
        console.error("BrandingSettings: save error", error);
        setSaveState("error");
        setMessage(
          error?.message || "Could not save branding settings. Please try again or contact support."
        );
        return;
      }

      setSettings(data as unknown as PortalSettings);
      setSaveState("saved");
      setMessage("Branding settings saved.");
      setDirty(false);
    } catch (err: unknown) {
      console.error("BrandingSettings: unexpected save error", err);
      setSaveState("error");
      setMessage("Unexpected error saving branding settings.");
    }
  }

  function ImageUploader({
    imageUrl,
    onUpload,
    onDelete,
    uploading,
    label,
    helpText,
    aspectClass = "h-32 w-48",
    previewClass = "h-32 w-48",
  }: {
    imageUrl: string | null;
    onUpload: (e: ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
    uploading: boolean;
    label: string;
    helpText: string;
    aspectClass?: string;
    previewClass?: string;
  }) {
    if (imageUrl) {
      return (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-700">{label}</p>
          <div className="relative group inline-block">
            <img
              src={imageUrl}
              alt={label}
              className={`${previewClass} rounded-lg border border-slate-200 object-cover`}
            />
            <button
              type="button"
              onClick={onDelete}
              className="absolute right-2 top-2 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              aria-label={`Delete ${label}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">{helpText}</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-700">{label}</p>
        <label className={`flex ${aspectClass} cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-slate-400 hover:bg-slate-100`}>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onUpload}
            disabled={uploading}
            className="sr-only"
          />
          {uploading ? (
            <span className="text-sm text-slate-600">Uploading...</span>
          ) : (
            <>
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="mt-1 text-sm text-slate-600">Add image</span>
            </>
          )}
        </label>
        <p className="text-[11px] text-slate-500">{helpText}</p>
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <p className="text-sm text-slate-700">
        Loading branding settings…
      </p>
    );
  }

  if (loadState === "error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {message || "Failed to load branding settings."}
      </div>
    );
  }

  if (!settings) return null;

  const showSaveBar =
    loadState === "ready" &&
    (dirty ||
      saveState === "saving" ||
      saveState === "error" ||
      saveState === "saved");

  const published = settings.is_published !== false;

  return (
    <div className="space-y-4 pb-20">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-slate-900">
          Branding &amp; Portal Settings
        </h1>
        <p className="mb-4 text-sm text-slate-700">
          Configure how this CiviPortal deployment appears to residents.
        </p>

        {/* Publish status - always visible */}
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Publish status
              </p>
              <p className="mt-1 text-xs text-slate-700">
                When published, your landing page and overview are visible to
                the public. When in draft, only admins can access the portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFieldChange("is_published", !published)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  published ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <span>
                {published
                  ? "Published – visible to public"
                  : "Draft – hidden from public"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <form
        id="branding-settings-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Modules Enable/Disable */}
        <CollapsibleSection
          title="Modules Enable/Disable"
          description="Choose which data modules are visible to the public"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.enable_actuals !== false}
                onChange={(e) =>
                  handleFieldChange(
                    "enable_actuals",
                    e.target.checked as PortalSettings["enable_actuals"]
                  )
                }
              />
              <span className="text-xs">
                <span className="font-medium">Budget &amp; actuals</span>
                <span className="block text-[11px] text-slate-600">
                  Show adopted budgets and spending by department/fund.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.enable_transactions === true}
                onChange={(e) =>
                  handleFieldChange(
                    "enable_transactions",
                    e.target.checked as PortalSettings["enable_transactions"]
                  )
                }
              />
              <span className="text-xs">
                <span className="font-medium">Transactions</span>
                <span className="block text-[11px] text-slate-600">
                  Show line-item spending (date, amount, department).
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700 opacity-100">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={
                  settings.enable_transactions === true &&
                  settings.enable_vendors === true
                }
                disabled={settings.enable_transactions !== true}
                onChange={(e) =>
                  handleFieldChange(
                    "enable_vendors",
                    e.target.checked as PortalSettings["enable_vendors"]
                  )
                }
              />
              <span className="text-xs">
                <span className="font-medium">Vendor names</span>
                <span className="block text-[11px] text-slate-600">
                  When on, show vendor names and vendor-level summaries.
                  Requires transactions to be enabled.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.enable_revenues === true}
                onChange={(e) =>
                  handleFieldChange(
                    "enable_revenues",
                    e.target.checked as PortalSettings["enable_revenues"]
                  )
                }
              />
              <span className="text-xs">
                <span className="font-medium">Revenues</span>
                <span className="block text-[11px] text-slate-600">
                  Show revenue dashboards by source (taxes, grants, fees,
                  etc.).
                </span>
              </span>
            </label>
          </div>
        </CollapsibleSection>

        {/* Branding */}
        <CollapsibleSection
          title="Branding"
          description="Gov name, tagline, colors, and images"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Gov name
              </label>
              <input
                type="text"
                value={settings.city_name ?? ""}
                onChange={(e) => handleFieldChange("city_name", e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. City of Example"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Tagline
              </label>
              <input
                type="text"
                value={settings.tagline ?? ""}
                onChange={(e) => handleFieldChange("tagline", e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. Transparent Budget. Empowered Citizens."
              />
            </div>

            {/* Color presets */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quick color presets
              </p>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSettings({
                        ...settings,
                        primary_color: preset.primary,
                        accent_color: preset.accent,
                        background_color: preset.background,
                      });
                      setDirty(true);
                    }}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:border-slate-300"
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.accent }} />
                    <span className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: preset.background }} />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Headline color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.primary_color ?? ""}
                    onChange={(e) => handleFieldChange("primary_color", e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="#0F172A"
                  />
                  <input
                    type="color"
                    value={settings.primary_color ?? "#0F172A"}
                    onChange={(e) => handleFieldChange("primary_color", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Button & highlight
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.accent_color ?? ""}
                    onChange={(e) => handleFieldChange("accent_color", e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="#0f766e"
                  />
                  <input
                    type="color"
                    value={settings.accent_color ?? "#0f766e"}
                    onChange={(e) => handleFieldChange("accent_color", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Sidebar color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={settings.background_color ?? ""}
                    onChange={(e) => handleFieldChange("background_color", e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="#020617"
                  />
                  <input
                    type="color"
                    value={settings.background_color ?? "#020617"}
                    onChange={(e) => handleFieldChange("background_color", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            {colorWarnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-xs font-semibold text-amber-800">Color accessibility warnings:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-700">
                  {colorWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Images */}
            {imageError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{imageError}</div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <ImageUploader
                imageUrl={settings.logo_url}
                onUpload={handleLogoUpload}
                onDelete={handleDeleteLogo}
                uploading={uploadingLogo}
                label="Logo"
                helpText="PNG with transparency works best. Max 5MB."
                aspectClass="h-24 w-24"
                previewClass="h-24 w-24"
              />

              <ImageUploader
                imageUrl={settings.seal_url}
                onUpload={handleSealUpload}
                onDelete={handleDeleteSeal}
                uploading={uploadingSeal}
                label="Gov seal (optional)"
                helpText="Square image works best. Max 5MB."
                aspectClass="h-24 w-24"
                previewClass="h-24 w-24"
              />

              <div className="sm:col-span-2">
                <ImageUploader
                  imageUrl={settings.hero_image_url}
                  onUpload={handleHeroUpload}
                  onDelete={handleDeleteHero}
                  uploading={uploadingHero}
                  label="Hero image"
                  helpText="Recommended 1920×600 or wider. Max 5MB."
                  aspectClass="h-32 w-full"
                  previewClass="h-32 w-full"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Landing Page Section Enable/Disable */}
        <CollapsibleSection
          title="Landing Page Section Enable/Disable"
          description="Toggle which sections appear on your public landing page"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.show_leadership !== false}
                onChange={(e) =>
                  handleFieldChange("show_leadership", e.target.checked as PortalSettings["show_leadership"])
                }
              />
              <span className="text-xs">
                <span className="font-medium">Leadership message</span>
                <span className="block text-[11px] text-slate-600">Welcome note from mayor / city manager.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.show_story !== false}
                onChange={(e) =>
                  handleFieldChange("show_story", e.target.checked as PortalSettings["show_story"])
                }
              />
              <span className="text-xs">
                <span className="font-medium">About our community</span>
                <span className="block text-[11px] text-slate-600">Narrative description of your city or county.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.show_year_review !== false}
                onChange={(e) =>
                  handleFieldChange("show_year_review", e.target.checked as PortalSettings["show_year_review"])
                }
              />
              <span className="text-xs">
                <span className="font-medium">Year in review</span>
                <span className="block text-[11px] text-slate-600">Highlights from the current fiscal year.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.show_capital_projects !== false}
                onChange={(e) =>
                  handleFieldChange("show_capital_projects", e.target.checked as PortalSettings["show_capital_projects"])
                }
              />
              <span className="text-xs">
                <span className="font-medium">Capital projects</span>
                <span className="block text-[11px] text-slate-600">Summary of major infrastructure investments.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.show_stats !== false}
                onChange={(e) =>
                  handleFieldChange("show_stats", e.target.checked as PortalSettings["show_stats"])
                }
              />
              <span className="text-xs">
                <span className="font-medium">Gov stats</span>
                <span className="block text-[11px] text-slate-600">Population, employees, area, and annual budget.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={settings.show_projects !== false}
                onChange={(e) =>
                  handleFieldChange("show_projects", e.target.checked as PortalSettings["show_projects"])
                }
              />
              <span className="text-xs">
                <span className="font-medium">Featured projects</span>
                <span className="block text-[11px] text-slate-600">Grid of 1–3 highlighted projects with images.</span>
              </span>
            </label>
          </div>
        </CollapsibleSection>

        {/* Story Sections */}
        <CollapsibleSection
          title="Story Sections"
          description="Hero message and community narrative content"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Hero message (landing page)
              </label>
              <AutoResizeTextarea
                value={settings.hero_message ?? ""}
                onChange={(e) => handleFieldChange("hero_message", e.target.value)}
                placeholder="Welcome residents. Explore your city's budget, spending, and financial health — all in one place."
                minRows={3}
              />
              <p className="mt-1 text-xs text-slate-600">
                This text appears in the public hero section on the overview page.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Gov description (About our community)
              </label>
              <AutoResizeTextarea
                value={settings.story_city_description ?? ""}
                onChange={(e) => handleFieldChange("story_city_description", e.target.value)}
                placeholder="Describe your community: population, location, and what makes it unique."
                minRows={4}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Year-in-review accomplishments
              </label>
              <AutoResizeTextarea
                value={settings.story_year_achievements ?? ""}
                onChange={(e) => handleFieldChange("story_year_achievements", e.target.value)}
                placeholder="Summarize key accomplishments, new services, and improvements delivered this fiscal year."
                minRows={4}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Leadership */}
        <CollapsibleSection
          title="Leadership"
          description="Welcome message from your mayor or city manager"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Leader name
                </label>
                <input
                  type="text"
                  value={settings.leader_name ?? ""}
                  onChange={(e) => handleFieldChange("leader_name", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Leader title
                </label>
                <input
                  type="text"
                  value={settings.leader_title ?? ""}
                  onChange={(e) => handleFieldChange("leader_title", e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder="e.g. City Manager"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Leader message
              </label>
              <AutoResizeTextarea
                value={settings.leader_message ?? ""}
                onChange={(e) => handleFieldChange("leader_message", e.target.value)}
                placeholder="A short welcome note about transparency, stewardship of public funds, and how residents can use this portal."
                minRows={4}
              />
            </div>

            <ImageUploader
              imageUrl={settings.leader_photo_url}
              onUpload={handleLeaderUpload}
              onDelete={handleDeleteLeader}
              uploading={uploadingLeader}
              label="Leader photo"
              helpText="Square images work best (will auto-crop to center if not square). Max 5MB."
              aspectClass="h-28 w-28"
              previewClass="h-28 w-28"
            />
          </div>
        </CollapsibleSection>

        {/* Gov Stats */}
        <CollapsibleSection
          title="Gov Stats"
          description="Key figures about your community"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Population
              </label>
              <input
                type="text"
                value={settings.stat_population ?? ""}
                onChange={(e) => handleFieldChange("stat_population", e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. 54,231"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Gov employees
              </label>
              <input
                type="text"
                value={settings.stat_employees ?? ""}
                onChange={(e) => handleFieldChange("stat_employees", e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. 312"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Area (square miles)
              </label>
              <input
                type="text"
                value={settings.stat_square_miles ?? ""}
                onChange={(e) => handleFieldChange("stat_square_miles", e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                placeholder="e.g. 35.8"
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Capital Projects */}
        <CollapsibleSection
          title="Capital Projects"
          description="Highlight text and featured project cards"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Capital projects highlight
              </label>
              <AutoResizeTextarea
                value={settings.story_capital_projects ?? ""}
                onChange={(e) => handleFieldChange("story_capital_projects", e.target.value)}
                placeholder="Call out major capital projects completed or underway (streets, facilities, parks, utilities)."
                minRows={4}
              />
              <p className="mt-1 text-xs text-slate-600">
                Shown in the &ldquo;Capital projects&rdquo; card on the public landing page.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-xs font-semibold text-slate-700 mb-3">Featured Projects</h3>
              <p className="text-xs text-slate-600 mb-3">
                Highlight 1–3 major capital or community projects with images.
              </p>

              <div className="space-y-4">
                {PROJECT_TITLE_KEYS.map((titleKey, idx) => {
                  const summaryKey = PROJECT_SUMMARY_KEYS[idx];
                  const imageKey: ProjectImageKey = PROJECT_IMAGE_KEYS[idx];

                  return (
                    <div
                      key={titleKey}
                      className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Project {idx + 1}
                      </p>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Title
                        </label>
                        <input
                          type="text"
                          value={settings[titleKey] ?? ""}
                          onChange={(e) => handleFieldChange(titleKey, e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                          placeholder="e.g. New Community Center"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Summary
                        </label>
                        <AutoResizeTextarea
                          value={settings[summaryKey] ?? ""}
                          onChange={(e) => handleFieldChange(summaryKey, e.target.value)}
                          placeholder="Briefly describe the project, what it delivers, and its impact on residents."
                          minRows={2}
                          className="text-xs"
                        />
                      </div>

                      <ImageUploader
                        imageUrl={settings[imageKey]}
                        onUpload={(e) => handleProjectUpload(idx, e)}
                        onDelete={() => handleDeleteProject(idx)}
                        uploading={uploadingProject === idx}
                        label="Project image"
                        helpText="Recommended 800×450 or wider. Max 5MB."
                        aspectClass="h-32 w-48"
                        previewClass="h-32 w-48"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Fiscal Year */}
        <CollapsibleSection
          title="Fiscal Year"
          description="Configure how fiscal years are displayed to residents"
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              This controls how the portal describes your fiscal year to residents. It does not change your uploaded data.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Fiscal year starts in
                </label>
                <select
                  value={settings.fiscal_year_start_month ?? 1}
                  onChange={(e) =>
                    handleFieldChange(
                      "fiscal_year_start_month",
                      Number(e.target.value) as PortalSettings["fiscal_year_start_month"]
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value={1}>January</option>
                  <option value={2}>February</option>
                  <option value={3}>March</option>
                  <option value={4}>April</option>
                  <option value={5}>May</option>
                  <option value={6}>June</option>
                  <option value={7}>July</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>
                <p className="mt-1 text-xs text-slate-600">
                  e.g. many cities use July 1 – June 30.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Start day
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={settings.fiscal_year_start_day ?? 1}
                  onChange={(e) =>
                    handleFieldChange(
                      "fiscal_year_start_day",
                      Number(e.target.value) as PortalSettings["fiscal_year_start_day"]
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
                <p className="mt-1 text-xs text-slate-600">
                  Most cities use the 1st.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Public label (optional)
                </label>
                <input
                  type="text"
                  value={settings.fiscal_year_label ?? ""}
                  onChange={(e) =>
                    handleFieldChange("fiscal_year_label", e.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  placeholder='e.g. "July 1 – June 30"'
                />
                <p className="mt-1 text-xs text-slate-600">
                  Shown to residents if set.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Portal Configuration */}
        <CollapsibleSection
          title="Portal configuration"
          description="Budget document link, methodology text, and feedback notifications"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="budget_doc_url" className="block text-xs font-semibold text-slate-700">
                Budget document URL
              </label>
              <p className="mb-1 text-[11px] text-slate-500">
                Link to the city&apos;s official adopted budget PDF. Shown on the Budget page.
              </p>
              <input
                id="budget_doc_url"
                type="url"
                placeholder="https://example.com/budget-2025.pdf"
                value={settings?.budget_document_url ?? ""}
                onChange={(e) =>
                  settings &&
                  setSettings({ ...settings, budget_document_url: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div>
              <label htmlFor="feedback_email" className="block text-xs font-semibold text-slate-700">
                Feedback notification email
              </label>
              <p className="mb-1 text-[11px] text-slate-500">
                When citizens submit feedback, a notification will be sent to this address.
              </p>
              <input
                id="feedback_email"
                type="email"
                placeholder="finance@cityname.gov"
                value={settings?.feedback_notification_email ?? ""}
                onChange={(e) =>
                  settings &&
                  setSettings({ ...settings, feedback_notification_email: e.target.value })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <hr className="border-slate-200" />

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">
                About this data — methodology overrides
              </p>
              <p className="mb-3 text-[11px] text-slate-500">
                Customize the &ldquo;About this data&rdquo; page with your city&apos;s specific information. Leave blank to use defaults.
              </p>

              <div className="space-y-3">
                <div>
                  <label htmlFor="meth_source" className="block text-[11px] font-medium text-slate-600">Data sources</label>
                  <textarea
                    id="meth_source"
                    rows={2}
                    placeholder="Describe where your financial data comes from..."
                    value={settings?.methodology_data_source ?? ""}
                    onChange={(e) =>
                      settings &&
                      setSettings({ ...settings, methodology_data_source: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="meth_basis" className="block text-[11px] font-medium text-slate-600">Accounting basis</label>
                  <textarea
                    id="meth_basis"
                    rows={2}
                    placeholder="e.g., Modified accrual for governmental funds..."
                    value={settings?.methodology_accounting_basis ?? ""}
                    onChange={(e) =>
                      settings &&
                      setSettings({ ...settings, methodology_accounting_basis: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="meth_schedule" className="block text-[11px] font-medium text-slate-600">Update schedule</label>
                  <input
                    id="meth_schedule"
                    type="text"
                    placeholder="e.g., Monthly after close, typically by the 15th"
                    value={settings?.methodology_update_schedule ?? ""}
                    onChange={(e) =>
                      settings &&
                      setSettings({ ...settings, methodology_update_schedule: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="meth_audit" className="block text-[11px] font-medium text-slate-600">Audit status</label>
                  <input
                    id="meth_audit"
                    type="text"
                    placeholder="e.g., FY2024 data is unaudited; FY2023 CAFR is available"
                    value={settings?.methodology_audit_status ?? ""}
                    onChange={(e) =>
                      settings &&
                      setSettings({ ...settings, methodology_audit_status: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="meth_exclusions" className="block text-[11px] font-medium text-slate-600">What is not included</label>
                  <textarea
                    id="meth_exclusions"
                    rows={2}
                    placeholder="e.g., This portal does not include pension fund assets, fiduciary funds, or component unit financials"
                    value={settings?.methodology_exclusions ?? ""}
                    onChange={(e) =>
                      settings &&
                      setSettings({ ...settings, methodology_exclusions: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Bottom save button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
          >
            {saveState === "saving" ? "Saving…" : "Save branding settings"}
          </button>
        </div>
      </form>

      {/* Sticky save bar */}
      {showSaveBar && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-4px_12px_rgba(15,23,42,0.15)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              {saveState === "error" ? (
                <p className="truncate text-xs text-red-700">
                  {message || "Could not save branding settings. Please try again."}
                </p>
              ) : saveState === "saving" ? (
                <p className="truncate text-xs text-slate-700">Saving…</p>
              ) : saveState === "saved" ? (
                <p className="truncate text-xs text-emerald-700">Branding settings saved.</p>
              ) : dirty ? (
                <p className="truncate text-xs text-slate-700">You have unsaved changes.</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  const form = document.getElementById("branding-settings-form") as HTMLFormElement | null;
                  form?.requestSubmit();
                }}
                disabled={saveState === "saving" || !dirty}
                className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-default disabled:opacity-50"
              >
                {saveState === "saving" ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
