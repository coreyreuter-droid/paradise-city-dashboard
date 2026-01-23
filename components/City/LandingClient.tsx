/**
 * LandingClient.tsx - Featured Projects Accent Bar Fix
 * 
 * FILE: components/City/LandingClient.tsx
 * 
 * PROBLEM: Featured projects section is missing the left accent color bar 
 * that other sections have.
 * 
 * SOLUTION: Wrap the section content with the same accent rail pattern 
 * used by SectionCard.
 * 
 * FIND this block (around lines 726-791) and REPLACE it entirely:
 */

// ============ REPLACE THIS ENTIRE BLOCK ============

            {/* Featured projects */}
            {showProjects && (
              <CardContainer>
                <section aria-label="Featured projects">
                  {/* Wrapper with accent rail - matches SectionCard pattern */}
                  <div className="group relative -mx-4 -my-4 overflow-hidden px-4 py-4">
                    {/* Left accent rail */}
                    <div
                      aria-hidden={true}
                      className="absolute inset-y-0 left-0 w-1 opacity-20 transition-opacity duration-200 group-hover:opacity-35 group-focus-within:opacity-35"
                      style={{ backgroundColor: accent }}
                    />

                    <div className="pl-3 space-y-4">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">Featured projects</h2>
                        <p className="mt-1 text-xs text-slate-700">
                          Major capital and community projects—delivered or underway.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => {
                          const title =
                            i === 1 ? project1Title : i === 2 ? project2Title : project3Title;
                          const summary =
                            i === 1 ? project1Summary : i === 2 ? project2Summary : project3Summary;
                          const imageUrl =
                            i === 1 ? project1ImageUrl : i === 2 ? project2ImageUrl : project3ImageUrl;
                          const isExpanded = !!expandedProjects[i];

                          return (
                            <article
                              key={i}
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                            >
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={`${title} project image`}
                                  className="h-40 w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="h-40 w-full bg-slate-100" aria-hidden={true} />
                              )}

                              <div className="p-4">
                                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>

                                <p
                                  id={`project-summary-${i}`}
                                  className={`mt-2 text-sm text-slate-800 ${isExpanded ? "" : "line-clamp-3"}`}
                                >
                                  {summary}
                                </p>

                                <button
                                  type="button"
                                  onClick={() => toggleProject(i)}
                                  aria-expanded={isExpanded}
                                  aria-controls={`project-summary-${i}`}
                                  className="mt-3 inline-flex items-center text-xs font-semibold text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                                >
                                  {isExpanded ? "Read less" : "Read more"}
                                  <span className="sr-only"> about {title}</span>
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </CardContainer>
            )}

// ============ END OF REPLACEMENT BLOCK ============
