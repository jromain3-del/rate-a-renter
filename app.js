/**
 * Rate a Renter — demo SPA backed by Supabase
 * Anon key is publishable (intended for the browser). No real emails.
 */
(function () {
  "use strict";

  const SUPABASE_URL = "https://bnsnbadmsxesyouaiafe.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJuc25iYWRtc3hlc3lvdWFpYWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMjcyNTksImV4cCI6MjEwODgwMzI1OX0.fsQlgc2AkETjgIbfIZt_HLjnK8wga6Ly1qjfdEybIsc";

  const DEMO_CODE = "482917";
  const MAX_PHOTOS = 4;
  const PHOTO_MAX_WIDTH = 800;
  const PHOTO_JPEG_QUALITY = 0.72;

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    document.getElementById("main").innerHTML =
      '<div class="empty-state"><p>Could not load the Supabase library. Check your network and refresh.</p></div>';
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const ADS = [
    {
      id: "carpet",
      kind: "carpet",
      icon: "🧹",
      label: "Sponsored",
      title: "FreshStep Carpet Care",
      blurb:
        "Professional carpet cleaning for move-ins and move-outs. Local techs, same-week availability.",
      cta: "Get a quote",
      href: "https://example.com/affiliate/carpet-cleaning",
    },
    {
      id: "house",
      kind: "house",
      icon: "✨",
      label: "Ad",
      title: "SparkHome Cleaning",
      blurb:
        "Trusted house cleaners for apartments and shared homes. One-time deep cleans or recurring plans.",
      cta: "Get a quote",
      href: "https://example.com/affiliate/house-cleaning",
    },
  ];

  const TRAITS = [
    { id: "punctual", label: "Punctual", polarity: "pos" },
    { id: "clean", label: "Clean", polarity: "pos" },
    { id: "messy", label: "Messy", polarity: "neg" },
    { id: "quiet", label: "Quiet", polarity: "pos" },
    { id: "loud", label: "Loud", polarity: "neg" },
    { id: "considerate", label: "Considerate", polarity: "pos" },
    { id: "unreliable", label: "Unreliable", polarity: "neg" },
    { id: "respectful", label: "Respectful", polarity: "pos" },
    { id: "late_rent", label: "Late rent", polarity: "neg" },
    { id: "responsive", label: "Responsive", polarity: "pos" },
    { id: "ignores_maintenance", label: "Ignores maintenance", polarity: "neg" },
    { id: "noisy_parties", label: "Noisy parties", polarity: "neg" },
    { id: "communicates_well", label: "Communicates well", polarity: "pos" },
    { id: "respectful_of_space", label: "Respectful of space", polarity: "pos" },
    { id: "fair", label: "Fair", polarity: "pos" },
    { id: "pet_friendly", label: "Pet-friendly", polarity: "pos" },
    { id: "unresponsive", label: "Unresponsive", polarity: "neg" },
    { id: "pays_on_time", label: "Pays on time", polarity: "pos" },
    { id: "damages_property", label: "Damages property", polarity: "neg" },
    { id: "helpful", label: "Helpful", polarity: "pos" },
  ];

  const TYPE_LABELS = {
    renter: "Renter",
    roommate: "Roommate",
    landlord: "Landlord",
  };

  // ---------- Helpers ----------
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
      });
    } catch (e) {
      return "";
    }
  }

  function traitDbValue(t) {
    return t.id.replace(/_/g, " ");
  }

  function traitByKey(key) {
    const k = String(key || "").toLowerCase().trim();
    return TRAITS.find(function (t) {
      return (
        t.id === key ||
        traitDbValue(t) === k ||
        t.label.toLowerCase() === k
      );
    });
  }

  function starsHtml(rating, sizeClass) {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    const full = Math.floor(r);
    const half = r - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    let html =
      '<span class="stars ' +
      (sizeClass || "") +
      '" aria-label="' +
      r.toFixed(1) +
      ' out of 5 stars">';
    for (let i = 0; i < full; i++) {
      html += '<span class="star-full" aria-hidden="true">★</span>';
    }
    if (half) html += '<span class="star-half" aria-hidden="true">★</span>';
    for (let i = 0; i < empty; i++) {
      html += '<span class="empty" aria-hidden="true">★</span>';
    }
    html += "</span>";
    return html;
  }

  function typeBadge(type) {
    const label = TYPE_LABELS[type] || type;
    return (
      '<span class="badge badge-' +
      escapeHtml(type) +
      '">' +
      escapeHtml(label) +
      "</span>"
    );
  }

  function traitChip(key) {
    const t = traitByKey(key);
    if (!t) {
      return (
        '<span class="trait trait-pos">' + escapeHtml(String(key)) + "</span>"
      );
    }
    const cls = t.polarity === "pos" ? "trait-pos" : "trait-neg";
    return (
      '<span class="trait ' + cls + '">' + escapeHtml(t.label) + "</span>"
    );
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.hidden = true;
    }, 3200);
  }

  function showLoading(msg) {
    main.innerHTML =
      '<div class="empty-state"><p>' +
      escapeHtml(msg || "Loading…") +
      "</p></div>";
  }

  function showError(msg) {
    main.innerHTML =
      '<div class="empty-state"><p>' +
      escapeHtml(msg) +
      '</p><button type="button" class="btn btn-secondary" id="retry-btn">Try again</button></div>';
    const btn = document.getElementById("retry-btn");
    if (btn) btn.addEventListener("click", function () { render(); });
  }

  function mapProfile(row) {
    return {
      id: row.id,
      name: row.name,
      type: row.subject_type,
      location: row.location || "",
      createdAt: row.created_at,
    };
  }

  function mapReview(row, flaggedIds) {
    const photos = Array.isArray(row.photos)
      ? row.photos
      : row.photos
        ? [].concat(row.photos)
        : [];
    return {
      id: row.id,
      profileId: row.profile_id,
      rating: Number(row.rating),
      body: row.body || "",
      traits: row.traits || [],
      authorName: row.reviewer_name || "Anonymous",
      anonymous: !!row.is_anonymous,
      verified: !!row.is_verified,
      email: row.author_email || "",
      createdAt: row.created_at,
      flagged: !!(flaggedIds && flaggedIds[row.id]),
      hidden: !!row.is_hidden,
      photos: photos,
      pendingVerify: !row.is_verified,
    };
  }

  function isPublicReview(r) {
    return r.verified && !r.hidden;
  }

  function profileStatsFromReviews(reviews) {
    const visible = reviews.filter(isPublicReview);
    if (!visible.length) return { avg: 0, count: 0, traitCounts: {} };
    const sum = visible.reduce(function (a, r) {
      return a + Number(r.rating);
    }, 0);
    const traitCounts = {};
    visible.forEach(function (r) {
      (r.traits || []).forEach(function (tid) {
        traitCounts[tid] = (traitCounts[tid] || 0) + 1;
      });
    });
    return {
      avg: Math.round((sum / visible.length) * 10) / 10,
      count: visible.length,
      traitCounts: traitCounts,
    };
  }

  function topTraits(traitCounts, limit) {
    return Object.keys(traitCounts)
      .map(function (id) {
        return { id: id, count: traitCounts[id] };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, limit || 6);
  }

  function compressImageFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image/") !== 0) {
        reject(new Error("Not an image"));
        return;
      }
      const reader = new FileReader();
      reader.onerror = function () {
        reject(new Error("Read failed"));
      };
      reader.onload = function () {
        const img = new Image();
        img.onerror = function () {
          reject(new Error("Image decode failed"));
        };
        img.onload = function () {
          let w = img.width;
          let h = img.height;
          if (w > PHOTO_MAX_WIDTH) {
            h = Math.round((h * PHOTO_MAX_WIDTH) / w);
            w = PHOTO_MAX_WIDTH;
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          try {
            resolve(canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY));
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- Ads / lightbox ----------
  function renderAdCard(ad, variant) {
    const cls = variant === "inline" ? "ad-card ad-inline" : "ad-card ad-sidebar";
    return (
      '<aside class="' +
      cls +
      '" aria-label="Sponsored advertisement">' +
      (variant === "inline"
        ? '<div class="ad-icon ' +
          escapeHtml(ad.kind) +
          '" aria-hidden="true">' +
          ad.icon +
          "</div>"
        : "") +
      "<div>" +
      '<span class="ad-label">' +
      escapeHtml(ad.label) +
      "</span>" +
      (variant !== "inline"
        ? '<div class="ad-icon ' +
          escapeHtml(ad.kind) +
          '" aria-hidden="true" style="margin-bottom:0.5rem;">' +
          ad.icon +
          "</div>"
        : "") +
      "<h3>" +
      escapeHtml(ad.title) +
      "</h3>" +
      "<p>" +
      escapeHtml(ad.blurb) +
      "</p>" +
      "</div>" +
      '<a class="btn btn-secondary btn-sm" href="' +
      escapeHtml(ad.href) +
      '" target="_blank" rel="noopener noreferrer sponsored">' +
      escapeHtml(ad.cta) +
      "</a>" +
      "</aside>"
    );
  }

  function renderSidebarAds() {
    return (
      '<aside class="page-sidebar" aria-label="Sponsored offers">' +
      ADS.map(function (ad) {
        return renderAdCard(ad, "sidebar");
      }).join("") +
      '<p class="text-muted" style="font-size:0.75rem;margin:0;">Demo affiliate links — placeholders only.</p>' +
      "</aside>"
    );
  }

  function renderInlineAd(index) {
    return renderAdCard(ADS[index % ADS.length], "inline");
  }

  let lightboxPhotos = [];
  let lightboxIndex = 0;

  function openLightbox(photos, index) {
    lightboxPhotos = photos || [];
    lightboxIndex = index || 0;
    const box = document.getElementById("lightbox");
    if (!box || !lightboxPhotos.length) return;
    updateLightbox();
    box.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    const box = document.getElementById("lightbox");
    if (!box) return;
    box.hidden = true;
    document.body.style.overflow = "";
    lightboxPhotos = [];
  }

  function updateLightbox() {
    const img = document.getElementById("lightbox-img");
    const cap = document.getElementById("lightbox-caption");
    const prev = document.getElementById("lightbox-prev");
    const next = document.getElementById("lightbox-next");
    if (!img || !lightboxPhotos.length) return;
    img.src = lightboxPhotos[lightboxIndex];
    if (cap) {
      cap.textContent =
        "Photo " + (lightboxIndex + 1) + " of " + lightboxPhotos.length;
    }
    const multi = lightboxPhotos.length > 1;
    if (prev) prev.hidden = !multi;
    if (next) next.hidden = !multi;
  }

  function bindLightboxControls() {
    const box = document.getElementById("lightbox");
    if (!box || box.dataset.bound === "1") return;
    box.dataset.bound = "1";
    document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
    document.getElementById("lightbox-prev").addEventListener("click", function () {
      if (!lightboxPhotos.length) return;
      lightboxIndex =
        (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
      updateLightbox();
    });
    document.getElementById("lightbox-next").addEventListener("click", function () {
      if (!lightboxPhotos.length) return;
      lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
      updateLightbox();
    });
    box.addEventListener("click", function (e) {
      if (e.target === box) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      const lb = document.getElementById("lightbox");
      if (!lb || lb.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") {
        lightboxIndex =
          (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
        updateLightbox();
      }
      if (e.key === "ArrowRight") {
        lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
        updateLightbox();
      }
    });
  }

  function photosHtml(photos) {
    if (!photos || !photos.length) return "";
    return (
      '<div class="review-photos" data-photos="1">' +
      photos
        .map(function (src, i) {
          return (
            '<button type="button" data-photo-index="' +
            i +
            '" aria-label="View photo ' +
            (i + 1) +
            '">' +
            '<img src="' +
            String(src).replace(/"/g, "&quot;") +
            '" alt="Review photo ' +
            (i + 1) +
            '" loading="lazy" />' +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function bindPhotoClicks(root, photosByReview) {
    root.querySelectorAll(".review-photos").forEach(function (wrap) {
      const card = wrap.closest("[data-review-id]");
      if (!card) return;
      const id = card.getAttribute("data-review-id");
      const photos = photosByReview[id] || [];
      wrap.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const idx = parseInt(btn.getAttribute("data-photo-index"), 10) || 0;
          openLightbox(photos, idx);
        });
      });
    });
  }

  // ---------- Data API ----------
  async function fetchFlaggedReviewIds() {
    const { data, error } = await sb
      .from("review_flags")
      .select("review_id")
      .eq("cleared", false);
    if (error) throw error;
    const map = {};
    (data || []).forEach(function (f) {
      map[f.review_id] = true;
    });
    return map;
  }

  async function fetchProfilesWithStats(opts) {
    opts = opts || {};
    let q = sb.from("profiles").select(
      "id, name, subject_type, location, created_at, reviews(id, rating, traits, is_verified, is_hidden)"
    );
    if (opts.type && opts.type !== "all") {
      q = q.eq("subject_type", opts.type);
    }
    const { data, error } = await q.order("name");
    if (error) throw error;

    let list = (data || []).map(function (row) {
      const profile = mapProfile(row);
      const reviews = (row.reviews || []).map(function (r) {
        return mapReview(r);
      });
      const stats = profileStatsFromReviews(reviews);
      return { p: profile, s: stats };
    });

    const query = (opts.query || "").trim().toLowerCase();
    if (query) {
      list = list.filter(function (item) {
        const hay = (
          item.p.name +
          " " +
          (item.p.location || "")
        ).toLowerCase();
        return hay.indexOf(query) !== -1;
      });
    }

    list.sort(function (a, b) {
      return b.s.count - a.s.count || b.s.avg - a.s.avg;
    });
    return list;
  }

  async function fetchProfile(id) {
    const { data, error } = await sb
      .from("profiles")
      .select("id, name, subject_type, location, created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapProfile(data) : null;
  }

  async function fetchReviewsForProfile(profileId, forMod) {
    const flagged = await fetchFlaggedReviewIds();
    let q = sb
      .from("reviews")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });
    if (!forMod) {
      q = q.eq("is_verified", true).eq("is_hidden", false);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data || []).map(function (r) {
      return mapReview(r, flagged);
    });
  }

  async function findOrCreateProfile(name, type, location) {
    const trimmed = name.trim();
    const loc = (location || "").trim();
    let q = sb
      .from("profiles")
      .select("id, name, subject_type, location, created_at")
      .ilike("name", trimmed)
      .eq("subject_type", type);
    const { data: existing, error: findErr } = await q;
    if (findErr) throw findErr;

    const match = (existing || []).find(function (row) {
      return (
        row.name.toLowerCase() === trimmed.toLowerCase() &&
        (row.location || "").toLowerCase() === loc.toLowerCase()
      );
    });
    if (match) return mapProfile(match);

    // Same name+type with empty location preference
    const loose = (existing || []).find(function (row) {
      return row.name.toLowerCase() === trimmed.toLowerCase();
    });
    if (loose && !loc) return mapProfile(loose);

    const { data: created, error: insErr } = await sb
      .from("profiles")
      .insert({
        name: trimmed,
        subject_type: type,
        location: loc || null,
      })
      .select("id, name, subject_type, location, created_at")
      .single();
    if (insErr) throw insErr;
    return mapProfile(created);
  }

  async function insertReview(payload) {
    const { data, error } = await sb
      .from("reviews")
      .insert({
        profile_id: payload.profileId,
        rating: payload.rating,
        body: payload.body,
        traits: payload.traits,
        is_anonymous: payload.anonymous,
        reviewer_name: payload.anonymous ? "Anonymous" : payload.authorName,
        author_email: payload.email,
        is_verified: false,
        is_hidden: false,
        photos: payload.photos || [],
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapReview(data);
  }

  async function verifyReview(id, email) {
    const patch = { is_verified: true };
    if (email) patch.author_email = email;
    const { data, error } = await sb
      .from("reviews")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapReview(data);
  }

  async function fetchReviewById(id) {
    const { data, error } = await sb
      .from("reviews")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReview(data) : null;
  }

  async function flagReview(reviewId, reason) {
    const { error } = await sb.from("review_flags").insert({
      review_id: reviewId,
      reason: reason || "Flagged as inappropriate",
      cleared: false,
    });
    if (error) throw error;
  }

  async function setReviewHidden(reviewId, hidden) {
    const { error } = await sb
      .from("reviews")
      .update({ is_hidden: !!hidden })
      .eq("id", reviewId);
    if (error) throw error;
  }

  async function clearFlagsForReview(reviewId) {
    const { error } = await sb
      .from("review_flags")
      .update({ cleared: true })
      .eq("review_id", reviewId)
      .eq("cleared", false);
    if (error) throw error;
  }

  async function fetchModerationBundle() {
    const flagged = await fetchFlaggedReviewIds();
    const { data: reviews, error } = await sb
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, name, subject_type, location");
    if (pErr) throw pErr;
    const profileMap = {};
    (profiles || []).forEach(function (p) {
      profileMap[p.id] = mapProfile(p);
    });
    const { data: flags, error: fErr } = await sb
      .from("review_flags")
      .select("*")
      .eq("cleared", false)
      .order("created_at", { ascending: false });
    if (fErr) throw fErr;
    return {
      reviews: (reviews || []).map(function (r) {
        return mapReview(r, flagged);
      }),
      profileMap: profileMap,
      flags: flags || [],
      flagged: flagged,
    };
  }

  // ---------- Routing ----------
  const main = document.getElementById("main");
  let searchQuery = "";
  let searchType = "all";
  let renderToken = 0;

  function parseRoute() {
    const hash = (location.hash || "#/").replace(/^#/, "") || "/";
    const parts = hash.split("/").filter(Boolean);
    if (!parts.length) return { name: "home", params: {} };
    if (parts[0] === "write") return { name: "write", params: {} };
    if (parts[0] === "guidelines") return { name: "guidelines", params: {} };
    if (parts[0] === "moderation") return { name: "moderation", params: {} };
    if (parts[0] === "profile" && parts[1])
      return { name: "profile", params: { id: parts[1] } };
    if (parts[0] === "verify" && parts[1])
      return { name: "verify", params: { id: parts[1] } };
    return { name: "home", params: {} };
  }

  function setActiveNav(name) {
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      const nav = a.getAttribute("data-nav");
      const active =
        (name === "home" && nav === "home") ||
        (name === "write" && nav === "write") ||
        (name === "guidelines" && nav === "guidelines") ||
        (name === "moderation" && nav === "moderation") ||
        (name === "verify" && nav === "write");
      a.classList.toggle("active", !!active);
    });
  }

  function navigate(hash) {
    location.hash = hash;
  }

  function filterChip(type, label) {
    return (
      '<button type="button" class="filter-chip' +
      (searchType === type ? " active" : "") +
      '" data-type="' +
      type +
      '">' +
      label +
      "</button>"
    );
  }

  // ---------- Views ----------
  async function renderHome() {
    showLoading("Loading profiles…");
    const list = await fetchProfilesWithStats({
      query: searchQuery,
      type: searchType,
    });

    let listingHtml;
    if (!list.length) {
      listingHtml =
        '<div class="empty-state"><p>No profiles match your search.</p><a class="btn btn-primary" href="#/write">Write the first review</a></div>';
    } else {
      const built = list.map(function (item, idx) {
        const p = item.p;
        const s = item.s;
        const tops = topTraits(s.traitCounts, 4)
          .map(function (t) {
            return traitChip(t.id);
          })
          .join("");
        const card =
          '<a class="profile-card" href="#/profile/' +
          encodeURIComponent(p.id) +
          '">' +
          "<div>" +
          '<p class="name">' +
          escapeHtml(p.name) +
          " " +
          typeBadge(p.type) +
          "</p>" +
          '<p class="meta-line">' +
          escapeHtml(p.location || "Location not listed") +
          "</p>" +
          (tops ? '<div class="traits-preview">' + tops + "</div>" : "") +
          "</div>" +
          '<div class="rating-block">' +
          (s.count
            ? '<div class="rating-num">' +
              s.avg.toFixed(1) +
              "</div>" +
              starsHtml(s.avg, "stars-sm") +
              '<div class="rating-count">' +
              s.count +
              " review" +
              (s.count === 1 ? "" : "s") +
              "</div>"
            : '<div class="rating-count">No reviews yet</div>') +
          "</div>" +
          "</a>";
        if (idx === 3) return card + renderInlineAd(0);
        return card;
      });
      listingHtml = '<div class="card-grid">' + built.join("") + "</div>";
      if (list.length > 6) listingHtml += renderInlineAd(1);
    }

    main.innerHTML =
      '<section class="hero">' +
      "<h1>Know who you're renting with</h1>" +
      '<p class="lead">Search constructive reviews of renters, roommates, and landlords — before you sign.</p>' +
      '<div class="search-card">' +
      '<form id="search-form" role="search">' +
      '<div class="field">' +
      '<label for="search-q">Search by name or location</label>' +
      '<div class="search-row">' +
      '<input id="search-q" type="search" placeholder="e.g. Jordan Lee or Austin" value="' +
      escapeHtml(searchQuery) +
      '" autocomplete="off" />' +
      '<button type="submit" class="btn btn-primary">Search</button>' +
      "</div></div>" +
      '<div class="filters" role="group" aria-label="Filter by type">' +
      filterChip("all", "All") +
      filterChip("renter", "Renters") +
      filterChip("roommate", "Roommates") +
      filterChip("landlord", "Landlords") +
      "</div></form></div></section>" +
      '<div class="page-with-sidebar"><div class="page-main">' +
      '<div class="section-head"><h2>Profiles</h2><span class="meta">' +
      list.length +
      " result" +
      (list.length === 1 ? "" : "s") +
      " · shared via Supabase</span></div>" +
      listingHtml +
      '<p class="text-muted" style="margin-top:1.5rem;font-size:0.875rem;">Looking to share an experience? <a href="#/write">Write a review</a>. Please read our <a href="#/guidelines">community guidelines</a> first.</p>' +
      "</div>" +
      renderSidebarAds() +
      "</div>";

    document.getElementById("search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      searchQuery = document.getElementById("search-q").value;
      render();
    });
    document.querySelectorAll(".filter-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        searchType = btn.getAttribute("data-type");
        render();
      });
    });
  }

  async function renderProfile(id) {
    showLoading("Loading profile…");
    const p = await fetchProfile(id);
    if (!p) {
      main.innerHTML =
        '<div class="empty-state"><p>Profile not found.</p><a class="btn btn-secondary" href="#/">Back to search</a></div>';
      return;
    }
    const reviews = await fetchReviewsForProfile(id, false);
    const stats = profileStatsFromReviews(reviews);
    const tops = topTraits(stats.traitCounts, 8);
    const traitAgg = tops
      .map(function (t) {
        const meta = traitByKey(t.id);
        const label = meta ? meta.label : t.id;
        const cls = meta && meta.polarity === "neg" ? "trait-neg" : "trait-pos";
        return (
          '<span class="trait trait-agg ' +
          cls +
          '">' +
          escapeHtml(label) +
          ' <span class="count">×' +
          t.count +
          "</span></span>"
        );
      })
      .join("");

    const reviewCards = reviews
      .map(function (r) {
        return renderReviewCard(r, false);
      })
      .join("");

    main.innerHTML =
      '<nav class="breadcrumb"><a href="#/">Search</a> / ' +
      escapeHtml(p.name) +
      "</nav>" +
      '<div class="page-with-sidebar"><div class="page-main">' +
      '<article class="profile-hero"><div class="top"><div>' +
      typeBadge(p.type) +
      "<h1>" +
      escapeHtml(p.name) +
      "</h1>" +
      '<p class="loc">' +
      escapeHtml(p.location || "Location not listed") +
      "</p></div>" +
      '<div class="big-rating">' +
      (stats.count
        ? '<div class="num">' +
          stats.avg.toFixed(1) +
          "</div>" +
          starsHtml(stats.avg, "stars-lg") +
          '<div class="count">' +
          stats.count +
          " review" +
          (stats.count === 1 ? "" : "s") +
          "</div>"
        : '<div class="count">No reviews yet</div>') +
      "</div></div>" +
      (traitAgg
        ? '<div class="popular-traits"><h3>Often mentioned</h3><div class="list">' +
          traitAgg +
          "</div></div>"
        : "") +
      "</article>" +
      '<div class="section-head"><h2>Reviews</h2>' +
      '<a class="btn btn-primary btn-sm" href="#/write">Write a review</a></div>' +
      (reviewCards
        ? '<div class="review-list">' + reviewCards + "</div>"
        : '<div class="empty-state"><p>No public reviews yet for this profile.</p></div>') +
      "</div>" +
      renderSidebarAds() +
      "</div>";

    bindReviewActions(main);
    const photosMap = {};
    reviews.forEach(function (r) {
      photosMap[r.id] = r.photos || [];
    });
    bindPhotoClicks(main, photosMap);
  }

  function renderReviewCard(r, forMod) {
    const traits = (r.traits || []).map(traitChip).join("");
    const badges = [];
    if (r.verified)
      badges.push('<span class="badge badge-verified">✓ Verified</span>');
    if (r.flagged)
      badges.push('<span class="badge badge-flagged">Flagged</span>');
    if (r.hidden)
      badges.push('<span class="badge badge-hidden">Hidden</span>');
    if (r.pendingVerify)
      badges.push('<span class="badge badge-sample">Pending verify</span>');

    let actions = "";
    if (forMod) {
      actions =
        '<div class="review-actions">' +
        '<button type="button" class="btn btn-sm btn-secondary" data-action="clear-flag" data-id="' +
        escapeHtml(r.id) +
        '">Clear flags</button>' +
        '<button type="button" class="btn btn-sm ' +
        (r.hidden ? "btn-primary" : "btn-danger") +
        '" data-action="toggle-hide" data-id="' +
        escapeHtml(r.id) +
        '">' +
        (r.hidden ? "Unhide" : "Hide") +
        "</button></div>";
    } else {
      actions =
        '<div class="review-actions">' +
        '<button type="button" class="btn btn-sm btn-ghost" data-action="flag" data-id="' +
        escapeHtml(r.id) +
        '">' +
        (r.flagged ? "Flagged for review" : "Flag as inappropriate") +
        "</button></div>";
    }

    const cls =
      "review-card" +
      (r.hidden ? " hidden-review" : "") +
      (r.flagged ? " flagged-review" : "");

    return (
      '<article class="' +
      cls +
      '" data-review-id="' +
      escapeHtml(r.id) +
      '">' +
      '<div class="review-head"><div>' +
      starsHtml(r.rating, "stars-sm") +
      " " +
      badges.join(" ") +
      '</div><span class="review-date">' +
      escapeHtml(formatDate(r.createdAt)) +
      "</span></div>" +
      '<div class="review-author">' +
      escapeHtml(r.anonymous ? "Anonymous" : r.authorName || "Anonymous") +
      "</div>" +
      (traits ? '<div class="review-traits">' + traits + "</div>" : "") +
      '<p class="review-body">' +
      escapeHtml(r.body) +
      "</p>" +
      photosHtml(r.photos) +
      actions +
      "</article>"
    );
  }

  function bindReviewActions(root) {
    root.querySelectorAll("[data-action]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        btn.disabled = true;
        try {
          if (action === "flag") {
            await flagReview(id, "Flagged as inappropriate by visitor");
            toast("Thanks — review flagged for moderation.");
            render();
          } else if (action === "clear-flag") {
            await clearFlagsForReview(id);
            toast("Flags cleared.");
            render();
          } else if (action === "toggle-hide") {
            const card = root.querySelector(
              '[data-review-id="' + id + '"]'
            );
            const currentlyHidden =
              card && card.classList.contains("hidden-review");
            await setReviewHidden(id, !currentlyHidden);
            toast(
              currentlyHidden
                ? "Review is public again."
                : "Review hidden from public view."
            );
            render();
          }
        } catch (err) {
          console.error(err);
          toast("Action failed: " + (err.message || "unknown error"));
          btn.disabled = false;
        }
      });
    });
  }

  function renderWrite() {
    const traitInputs = TRAITS.map(function (t) {
      return (
        '<label class="' +
        (t.polarity === "pos" ? "pos" : "neg") +
        '">' +
        '<input type="checkbox" name="traits" value="' +
        escapeHtml(t.id) +
        '" />' +
        escapeHtml(t.label) +
        "</label>"
      );
    }).join("");

    main.innerHTML =
      '<div class="form-card">' +
      "<h1>Write a review</h1>" +
      '<p class="intro">Share a constructive experience. Reviews require a demo email verification step before they appear publicly. Data is saved to Supabase and shared with other visitors.</p>' +
      '<div class="callout"><strong>Be fair.</strong> Stick to first-hand experience. Do not post threats, hate, or false claims. See <a href="#/guidelines">guidelines</a>.</div>' +
      '<form id="review-form">' +
      '<div class="form-row-2">' +
      '<div class="field"><label for="subject-type">Who are you reviewing?</label>' +
      '<select id="subject-type" required>' +
      '<option value="renter">Renter / tenant</option>' +
      '<option value="roommate">Roommate</option>' +
      '<option value="landlord">Landlord / property manager</option>' +
      "</select></div>" +
      '<div class="field"><label for="subject-location">City / location (optional)</label>' +
      '<input id="subject-location" type="text" placeholder="e.g. Austin, TX" maxlength="80" /></div>' +
      "</div>" +
      '<div class="field"><label for="subject-name">Name or display handle</label>' +
      '<input id="subject-name" type="text" required maxlength="80" placeholder="Full name or how they\'re known" />' +
      '<p class="hint">Use a name others can search for.</p></div>' +
      '<div class="field"><span id="rating-label" style="display:block;font-size:0.8125rem;font-weight:600;color:var(--ink-muted);margin-bottom:0.35rem;">Star rating</span>' +
      '<div class="star-picker" role="group" aria-labelledby="rating-label">' +
      [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
        .map(function (n) {
          return (
            '<button type="button" data-rating="' + n + '">' + n + "★</button>"
          );
        })
        .join("") +
      '<span class="rating-label" id="rating-display">Select a rating</span></div>' +
      '<input type="hidden" id="rating-value" value="" /></div>' +
      '<div class="field"><label for="review-body">Your review</label>' +
      '<textarea id="review-body" required maxlength="2000" placeholder="Describe your experience…"></textarea></div>' +
      '<div class="field"><label>Traits that apply</label>' +
      '<div class="trait-legend"><span class="pos">Positive</span><span class="neg">Negative / caution</span></div>' +
      '<div class="trait-picker" id="trait-picker">' +
      traitInputs +
      "</div></div>" +
      '<div class="field photo-field"><label for="photo-input">Photos (optional, up to ' +
      MAX_PHOTOS +
      ")</label>" +
      '<div class="photo-drop">' +
      '<input id="photo-input" type="file" accept="image/*" multiple />' +
      '<p class="hint" style="margin-top:0.5rem;margin-bottom:0;">Resized in your browser (~800px) and stored with the review. Avoid photos that identify private addresses or people without consent.</p>' +
      '<div class="photo-preview" id="photo-preview"></div></div></div>' +
      '<div class="form-row-2">' +
      '<div class="field"><label for="author-name">Your display name</label>' +
      '<input id="author-name" type="text" maxlength="60" placeholder="First name or initials" /></div>' +
      '<div class="field"><label for="author-email">Email (for verification)</label>' +
      '<input id="author-email" type="email" required maxlength="120" placeholder="you@example.com" />' +
      '<p class="hint">Demo only — nothing is emailed.</p></div></div>' +
      '<label class="check-row"><input type="checkbox" id="anonymous" />' +
      "<span>Submit anonymously (show as <strong>Anonymous</strong>)</span></label>" +
      '<div class="form-actions">' +
      '<button type="submit" class="btn btn-primary" id="submit-review">Continue to verification</button>' +
      '<a class="btn btn-ghost" href="#/">Cancel</a></div></form></div>';

    let selectedRating = null;
    let draftPhotos = [];
    const ratingInput = document.getElementById("rating-value");
    const ratingDisplay = document.getElementById("rating-display");

    function refreshPhotoPreview() {
      const box = document.getElementById("photo-preview");
      if (!box) return;
      box.innerHTML = draftPhotos
        .map(function (src, i) {
          return (
            '<div class="photo-thumb-wrap">' +
            '<img src="' +
            src.replace(/"/g, "&quot;") +
            '" alt="Selected photo ' +
            (i + 1) +
            '" />' +
            '<button type="button" class="photo-remove" data-remove-photo="' +
            i +
            '" aria-label="Remove photo">&times;</button></div>'
          );
        })
        .join("");
      box.querySelectorAll("[data-remove-photo]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          draftPhotos.splice(
            parseInt(btn.getAttribute("data-remove-photo"), 10),
            1
          );
          refreshPhotoPreview();
        });
      });
    }

    document.getElementById("photo-input").addEventListener("change", function (e) {
      const files = Array.from(e.target.files || []);
      e.target.value = "";
      if (!files.length) return;
      const room = MAX_PHOTOS - draftPhotos.length;
      if (room <= 0) {
        toast("You can attach up to " + MAX_PHOTOS + " photos.");
        return;
      }
      const take = files.slice(0, room);
      Promise.all(
        take.map(function (f) {
          return compressImageFile(f).catch(function () {
            return null;
          });
        })
      ).then(function (urls) {
        urls.filter(Boolean).forEach(function (u) {
          draftPhotos.push(u);
        });
        refreshPhotoPreview();
      });
    });

    document.querySelectorAll(".star-picker button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedRating = parseFloat(btn.getAttribute("data-rating"));
        ratingInput.value = String(selectedRating);
        ratingDisplay.textContent = selectedRating + " / 5";
        document.querySelectorAll(".star-picker button").forEach(function (b) {
          b.classList.toggle(
            "selected",
            parseFloat(b.getAttribute("data-rating")) === selectedRating
          );
        });
      });
    });

    document.querySelectorAll("#trait-picker input").forEach(function (inp) {
      inp.addEventListener("change", function () {
        inp.closest("label").classList.toggle("selected", inp.checked);
      });
    });

    document.getElementById("anonymous").addEventListener("change", function () {
      const nameField = document.getElementById("author-name");
      if (this.checked) {
        nameField.disabled = true;
        nameField.value = "";
      } else {
        nameField.disabled = false;
      }
    });

    document.getElementById("review-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      if (selectedRating === null || ratingInput.value === "") {
        toast("Please select a star rating.");
        return;
      }
      const anonymous = document.getElementById("anonymous").checked;
      const authorName = document.getElementById("author-name").value.trim();
      if (!anonymous && !authorName) {
        toast("Enter a display name, or choose anonymous.");
        return;
      }
      const traits = Array.from(
        document.querySelectorAll("#trait-picker input:checked")
      ).map(function (el) {
        const t = traitByKey(el.value);
        return t ? traitDbValue(t) : el.value;
      });

      const submitBtn = document.getElementById("submit-review");
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";

      try {
        const profile = await findOrCreateProfile(
          document.getElementById("subject-name").value.trim(),
          document.getElementById("subject-type").value,
          document.getElementById("subject-location").value.trim()
        );
        const review = await insertReview({
          profileId: profile.id,
          rating: selectedRating,
          body: document.getElementById("review-body").value.trim(),
          traits: traits,
          anonymous: anonymous,
          authorName: authorName,
          email: document
            .getElementById("author-email")
            .value.trim()
            .toLowerCase(),
          photos: draftPhotos.slice(0, MAX_PHOTOS),
        });
        toast("Review saved — verify your email to publish.");
        navigate("#/verify/" + review.id);
      } catch (err) {
        console.error(err);
        toast(
          "Could not save review: " +
            (err.message || err.error_description || "unknown error")
        );
        submitBtn.disabled = false;
        submitBtn.textContent = "Continue to verification";
      }
    });
  }

  async function renderVerify(id) {
    showLoading("Loading verification…");
    const review = await fetchReviewById(id);
    if (!review) {
      main.innerHTML =
        '<div class="empty-state"><p>Verification session not found.</p><a class="btn btn-secondary" href="#/write">Write a review</a></div>';
      return;
    }
    if (review.verified) {
      main.innerHTML =
        '<div class="form-card"><h1>Already verified</h1><p class="intro">This review is published.</p>' +
        '<a class="btn btn-primary" href="#/profile/' +
        encodeURIComponent(review.profileId) +
        '">View profile</a></div>';
      return;
    }

    const profile = await fetchProfile(review.profileId);

    main.innerHTML =
      '<div class="form-card">' +
      "<h1>Verify your email</h1>" +
      '<p class="intro">In a real product we\'d email a code to <strong>' +
      escapeHtml(review.email || "your inbox") +
      "</strong>. This is a demo — use the code below.</p>" +
      '<div class="step-panel"><h2>Demo verification code</h2>' +
      "<p>Pretend this arrived in your inbox:</p>" +
      '<div class="demo-code" aria-label="Demo verification code">' +
      DEMO_CODE +
      "</div>" +
      '<form id="verify-form">' +
      '<div class="field"><label for="verify-code">Enter the code</label>' +
      '<input id="verify-code" type="text" inputmode="numeric" maxlength="8" required autocomplete="one-time-code" placeholder="6-digit code" /></div>' +
      '<div class="form-actions" style="border:0;padding-top:0;margin-top:0.5rem;">' +
      '<button type="submit" class="btn btn-primary">Verify &amp; publish</button>' +
      '<button type="button" class="btn btn-secondary" id="verify-skip">Demo: verify without typing</button>' +
      "</div></form></div>" +
      '<p class="text-muted" style="margin-top:1rem;font-size:0.875rem;">Review for <strong>' +
      escapeHtml(profile ? profile.name : "subject") +
      "</strong> stays unpublished until verified.</p></div>";

    async function publish() {
      try {
        await verifyReview(review.id, review.email);
        toast("Email verified — review published.");
        navigate("#/profile/" + review.profileId);
      } catch (err) {
        console.error(err);
        toast("Verification failed: " + (err.message || "unknown error"));
      }
    }

    document.getElementById("verify-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const code = document.getElementById("verify-code").value.trim();
      if (code !== DEMO_CODE) {
        toast("That code doesn't match. Use " + DEMO_CODE + " for this demo.");
        return;
      }
      publish();
    });
    document.getElementById("verify-skip").addEventListener("click", publish);
  }

  function renderGuidelines() {
    main.innerHTML =
      '<div class="guidelines-card">' +
      "<h1>Community guidelines</h1>" +
      "<p>Rate a Renter exists so people can share <strong>constructive, first-hand</strong> rental experiences.</p>" +
      "<h2>Do</h2><ul>" +
      "<li>Describe your own experience with concrete details when possible.</li>" +
      "<li>Focus on behavior relevant to living or leasing together.</li>" +
      "<li>Be honest and fair.</li>" +
      "<li>Use anonymous submission if you need privacy — still keep content factual.</li>" +
      "</ul>" +
      "<h2>Don't</h2><ul>" +
      "<li>Post threats, hate speech, or personal attacks.</li>" +
      "<li>Share private contact info or documents.</li>" +
      "<li>Invent reviews or review people you've never dealt with.</li>" +
      "</ul>" +
      "<h2>Moderation</h2>" +
      '<p class="text-muted">Anyone can flag a review. Demo moderators can hide content from the <a href="#/moderation">Moderation</a> panel.</p>' +
      "<h2>Sponsored offers</h2>" +
      '<p class="text-muted">Occasional <strong>Sponsored</strong> / <strong>Ad</strong> placements help keep Rate a Renter free. Ads are labeled and are not endorsements.</p>' +
      "<h2>Disclaimer</h2>" +
      '<p class="text-muted">This is a <strong>demo</strong>. Reviews are stored in Supabase and shared across visitors. Nothing here is legal advice or a background check.</p>' +
      '<p style="margin-top:1.5rem;"><a class="btn btn-primary" href="#/write">Write a review</a> <a class="btn btn-secondary" href="#/">Back to search</a></p>' +
      "</div>";
  }

  async function renderModeration() {
    showLoading("Loading moderation queue…");
    const bundle = await fetchModerationBundle();
    const showFlaggedOnly = sessionStorage.getItem("rar_mod_flagged") === "1";
    const flaggedCount = bundle.reviews.filter(function (r) {
      return r.flagged;
    }).length;
    const hiddenCount = bundle.reviews.filter(function (r) {
      return r.hidden;
    }).length;
    const pendingCount = bundle.reviews.filter(function (r) {
      return r.pendingVerify;
    }).length;

    const source = showFlaggedOnly
      ? bundle.reviews.filter(function (r) {
          return r.flagged;
        })
      : bundle.reviews;

    const list = source
      .map(function (r) {
        const p = bundle.profileMap[r.profileId];
        return (
          '<div style="margin-bottom:0.35rem;font-size:0.8125rem;color:var(--ink-faint);">' +
          'Re: <a href="#/profile/' +
          encodeURIComponent(r.profileId) +
          '">' +
          escapeHtml(p ? p.name : "Unknown") +
          "</a>" +
          (r.pendingVerify ? " · <em>pending email verification</em>" : "") +
          "</div>" +
          renderReviewCard(r, true)
        );
      })
      .join("");

    main.innerHTML =
      '<h1 style="font-family:var(--font-display);font-size:1.65rem;margin:0 0 0.5rem;">Moderation</h1>' +
      '<p class="text-muted" style="margin-top:0;">Demo admin tools — no password. Hide content and clear flags. Changes save to Supabase. <a href="#/guidelines">Guidelines</a></p>' +
      '<div class="mod-stats">' +
      '<div class="stat-pill"><strong>' +
      flaggedCount +
      "</strong>Flagged</div>" +
      '<div class="stat-pill"><strong>' +
      hiddenCount +
      "</strong>Hidden</div>" +
      '<div class="stat-pill"><strong>' +
      pendingCount +
      "</strong>Pending verify</div>" +
      '<div class="stat-pill"><strong>' +
      bundle.reviews.length +
      "</strong>Total reviews</div></div>" +
      '<div class="mod-toolbar">' +
      '<button type="button" class="btn btn-sm ' +
      (showFlaggedOnly ? "btn-primary" : "btn-secondary") +
      '" id="mod-filter-flagged">' +
      (showFlaggedOnly ? "Showing flagged only" : "Show flagged only") +
      "</button></div>" +
      '<div class="section-head"><h2>' +
      (showFlaggedOnly ? "Flagged reviews" : "All reviews") +
      "</h2></div>" +
      (list
        ? '<div class="review-list">' + list + "</div>"
        : '<div class="empty-state"><p>Nothing to show.</p></div>');

    document
      .getElementById("mod-filter-flagged")
      .addEventListener("click", function () {
        sessionStorage.setItem(
          "rar_mod_flagged",
          showFlaggedOnly ? "0" : "1"
        );
        render();
      });

    bindReviewActions(main);
    const photosMap = {};
    bundle.reviews.forEach(function (r) {
      photosMap[r.id] = r.photos || [];
    });
    bindPhotoClicks(main, photosMap);
  }

  async function render() {
    const token = ++renderToken;
    const route = parseRoute();
    setActiveNav(route.name);

    const mobile = document.getElementById("mobile-nav");
    const toggle = document.getElementById("nav-toggle");
    if (mobile && !mobile.hidden) {
      mobile.hidden = true;
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    try {
      switch (route.name) {
        case "write":
          renderWrite();
          break;
        case "verify":
          await renderVerify(route.params.id);
          break;
        case "profile":
          await renderProfile(route.params.id);
          break;
        case "guidelines":
          renderGuidelines();
          break;
        case "moderation":
          await renderModeration();
          break;
        default:
          await renderHome();
      }
      if (token !== renderToken) return;
      window.scrollTo(0, 0);
    } catch (err) {
      if (token !== renderToken) return;
      console.error(err);
      showError(
        "Could not load data from Supabase. " +
          (err.message || "Check your connection and try again.")
      );
    }
  }

  // Mobile nav
  const navToggle = document.getElementById("nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      const open = mobileNav.hidden;
      mobileNav.hidden = !open;
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.hidden = true;
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  bindLightboxControls();
  window.addEventListener("hashchange", render);
  render();
})();
