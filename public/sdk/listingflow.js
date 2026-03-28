/**
 * ListingFlow Website Integration SDK
 * Embed: <script src="https://app.listingflow.com/sdk/listingflow.js" data-key="lf_xxx"></script>
 *
 * Auto-initializes on DOM ready. Provides:
 *   ListingFlow.trackPageView()
 *   ListingFlow.trackEvent(type, metadata)
 *   ListingFlow.submitLead({ name, phone, email, message, source_page })
 *   ListingFlow.mountChat(elementId)
 *   ListingFlow.mountNewsletter(elementId)
 *   ListingFlow.mountListings(elementId, options)
 *   ListingFlow.mountBooking(elementId)
 */
(function () {
  "use strict";

  // --- Config ---
  var script = document.currentScript || document.querySelector("script[data-key]");
  var API_KEY = script ? script.getAttribute("data-key") : "";
  var BASE_URL = script ? (script.getAttribute("data-url") || script.src.replace("/sdk/listingflow.js", "")) : "";

  if (!API_KEY) {
    console.warn("[ListingFlow] Missing data-key attribute on script tag.");
    return;
  }

  // --- Session tracking ---
  var SESSION_KEY = "lf_session";
  var VISITOR_KEY = "lf_visitor";

  function getSessionId() {
    var sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = "lfs_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  }

  function getVisitorId() {
    var vid = localStorage.getItem(VISITOR_KEY);
    if (!vid) {
      vid = "lfv_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, vid);
    }
    return vid;
  }

  function getDeviceType() {
    var w = window.innerWidth;
    return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  }

  function getUTM() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
    };
  }

  // --- Event queue ---
  var eventQueue = [];
  var flushTimer = null;

  function queueEvent(type, metadata) {
    eventQueue.push({
      event_type: type,
      page_url: window.location.pathname + window.location.search,
      page_path: window.location.pathname,
      referrer: document.referrer || "",
      session_id: getSessionId(),
      device_type: getDeviceType(),
      user_agent: navigator.userAgent,
      listing_id: (metadata && metadata.listing_id) || null,
    });

    if (!flushTimer) {
      flushTimer = setTimeout(flushEvents, 5000);
    }
  }

  function flushEvents() {
    flushTimer = null;
    if (eventQueue.length === 0) return;

    var batch = eventQueue.splice(0, 100);
    fetch(BASE_URL + "/api/websites/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-LF-Key": API_KEY },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(function () {
      // Re-queue failed events
      eventQueue = batch.concat(eventQueue);
    });
  }

  // --- API helpers ---
  function apiPost(path, data) {
    return fetch(BASE_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-LF-Key": API_KEY },
      body: JSON.stringify(data),
    }).then(function (r) { return r.json(); });
  }

  function apiGet(path) {
    return fetch(BASE_URL + path, {
      headers: { "X-LF-Key": API_KEY },
    }).then(function (r) { return r.json(); });
  }

  // --- Public API ---
  var LF = {
    version: "1.0.0",
    key: API_KEY,

    trackPageView: function () {
      queueEvent("page_view", { title: document.title });
    },

    trackEvent: function (type, metadata) {
      queueEvent(type, metadata);
    },

    submitLead: function (data) {
      queueEvent("form_submit", { form: "lead", page: window.location.pathname });
      return apiPost("/api/websites/lead", Object.assign({ source_page: window.location.pathname }, data));
    },

    submitNewsletter: function (data) {
      queueEvent("newsletter_signup", { page: window.location.pathname });
      return apiPost("/api/websites/newsletter", data);
    },

    submitBooking: function (data) {
      queueEvent("booking_submit", { page: window.location.pathname });
      return apiPost("/api/websites/booking", data);
    },

    submitValuation: function (data) {
      queueEvent("valuation_request", { page: window.location.pathname });
      return apiPost("/api/websites/valuation", data);
    },

    getListings: function (filters) {
      var params = new URLSearchParams(filters || {}).toString();
      return apiGet("/api/websites/listings" + (params ? "?" + params : ""));
    },

    // --- Widget mounting ---

    mountNewsletter: function (elementId) {
      var el = document.getElementById(elementId);
      if (!el) return console.warn("[ListingFlow] Element #" + elementId + " not found");

      el.innerHTML = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:400px;">'
        + '<form id="lf-nl-form" style="display:flex;flex-direction:column;gap:8px;">'
        + '<input type="email" placeholder="Your email" required style="padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;" id="lf-nl-email">'
        + '<label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#666;">'
        + '<input type="checkbox" required id="lf-nl-consent"> I agree to receive emails (you can unsubscribe anytime)'
        + '</label>'
        + '<button type="submit" style="padding:10px 20px;background:#1a1535;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Subscribe</button>'
        + '</form>'
        + '<div id="lf-nl-msg" style="display:none;padding:10px;text-align:center;color:#059669;font-size:14px;"></div>'
        + '</div>';

      el.querySelector("#lf-nl-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var email = el.querySelector("#lf-nl-email").value;
        var consent = el.querySelector("#lf-nl-consent").checked;
        LF.submitNewsletter({ email: email, consent: consent }).then(function (r) {
          el.querySelector("#lf-nl-form").style.display = "none";
          var msg = el.querySelector("#lf-nl-msg");
          msg.style.display = "block";
          msg.textContent = r.message || "You're subscribed!";
        });
      });
    },

    mountListings: function (elementId, options) {
      var el = document.getElementById(elementId);
      if (!el) return console.warn("[ListingFlow] Element #" + elementId + " not found");

      el.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Loading listings...</div>';

      LF.getListings(options).then(function (listings) {
        if (!listings || listings.length === 0) {
          el.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">No listings available</div>';
          return;
        }

        var cols = (options && options.columns) || 3;
        var html = '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:16px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">';

        listings.forEach(function (l) {
          var price = l.list_price ? "$" + Number(l.list_price).toLocaleString() : "";
          var img = l.hero_image_url || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3Ctext x='200' y='150' text-anchor='middle' fill='%23999' font-size='14'%3ENo Photo%3C/text%3E%3C/svg%3E";
          var details = [l.bedrooms ? l.bedrooms + " bd" : "", l.bathrooms ? l.bathrooms + " ba" : "", l.sqft ? l.sqft + " sqft" : ""].filter(Boolean).join(" · ");

          html += '<div style="border:1px solid #eee;border-radius:12px;overflow:hidden;background:#fff;">'
            + '<img src="' + img + '" style="width:100%;height:200px;object-fit:cover;" alt="' + (l.address || "") + '">'
            + '<div style="padding:12px;">'
            + '<div style="font-weight:600;font-size:18px;color:#1a1535;">' + price + '</div>'
            + '<div style="font-size:13px;color:#666;margin-top:2px;">' + (l.address || "") + '</div>'
            + (details ? '<div style="font-size:12px;color:#999;margin-top:4px;">' + details + '</div>' : '')
            + '</div></div>';
        });

        html += '</div>';
        el.innerHTML = html;

        // Track listing impressions
        LF.trackEvent("listings_widget_loaded", { count: listings.length });
      });
    },

    mountChat: function () {
      if (document.getElementById("lf-chat-root")) return; // Already mounted

      var root = document.createElement("div");
      root.id = "lf-chat-root";
      document.body.appendChild(root);

      var isOpen = false;
      var messages = [];
      var greeting = (script && script.getAttribute("data-chat-greeting"))
        || "Hi! I can help you find properties, book showings, or answer questions about the market. How can I help?";

      messages.push({ role: "assistant", content: greeting });

      function render() {
        root.innerHTML = "";

        // Bubble
        var bubble = document.createElement("div");
        bubble.style.cssText = "position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#1a1535;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:24px;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:99999;transition:transform 0.2s;";
        bubble.innerHTML = isOpen ? "✕" : "💬";
        bubble.title = isOpen ? "Close chat" : "Chat with us";
        bubble.addEventListener("click", function () {
          isOpen = !isOpen;
          if (isOpen) LF.trackEvent("chat_open");
          render();
        });
        root.appendChild(bubble);

        if (!isOpen) return;

        // Chat panel
        var panel = document.createElement("div");
        panel.style.cssText = "position:fixed;bottom:86px;right:20px;width:380px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.15);z-index:99998;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;animation:lf-slide-up 0.3s ease;";

        // Header
        var header = document.createElement("div");
        header.style.cssText = "padding:16px 18px;background:#1a1535;color:#fff;display:flex;align-items:center;gap:10px;";
        header.innerHTML = '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4f35d2,#ff5c3a);display:flex;align-items:center;justify-content:center;font-size:16px;">🏠</div>'
          + '<div><div style="font-size:14px;font-weight:600;">Property Assistant</div>'
          + '<div style="font-size:11px;opacity:0.7;">Powered by AI</div></div>';
        panel.appendChild(header);

        // Messages area
        var msgsArea = document.createElement("div");
        msgsArea.id = "lf-chat-msgs";
        msgsArea.style.cssText = "flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;";

        messages.forEach(function (m) {
          var msg = document.createElement("div");
          var isUser = m.role === "user";
          msg.style.cssText = "max-width:85%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;word-wrap:break-word;"
            + (isUser
              ? "align-self:flex-end;background:#4f35d2;color:#fff;border-bottom-right-radius:4px;"
              : "align-self:flex-start;background:#f0f0f5;color:#1a1535;border-bottom-left-radius:4px;");
          msg.textContent = m.content;
          msgsArea.appendChild(msg);
        });

        // Typing indicator
        if (root._loading) {
          var typing = document.createElement("div");
          typing.style.cssText = "align-self:flex-start;padding:10px 14px;background:#f0f0f5;border-radius:14px;border-bottom-left-radius:4px;font-size:14px;color:#999;";
          typing.innerHTML = '<span style="animation:lf-blink 1s infinite;">●</span> <span style="animation:lf-blink 1s 0.2s infinite;">●</span> <span style="animation:lf-blink 1s 0.4s infinite;">●</span>';
          msgsArea.appendChild(typing);
        }

        panel.appendChild(msgsArea);

        // Quick actions (only show at start)
        if (messages.length <= 1) {
          var quickActions = document.createElement("div");
          quickActions.style.cssText = "padding:0 16px 8px;display:flex;flex-wrap:wrap;gap:6px;";
          ["Search Homes", "Book a Showing", "Market Trends", "Get a Valuation"].forEach(function (label) {
            var btn = document.createElement("button");
            btn.style.cssText = "padding:6px 12px;border-radius:16px;border:1px solid #e0e0e0;background:#fff;font-size:12px;cursor:pointer;color:#4f35d2;transition:all 0.2s;";
            btn.textContent = label;
            btn.addEventListener("click", function () { sendMessage(label); });
            quickActions.appendChild(btn);
          });
          panel.appendChild(quickActions);
        }

        // Input area
        var inputArea = document.createElement("div");
        inputArea.style.cssText = "padding:12px 16px;border-top:1px solid #f0f0f0;display:flex;gap:8px;";
        var input = document.createElement("input");
        input.id = "lf-chat-input";
        input.type = "text";
        input.placeholder = "Type a message...";
        input.style.cssText = "flex:1;padding:10px 14px;border:1px solid #e0e0e0;border-radius:20px;font-size:14px;outline:none;";
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && input.value.trim()) sendMessage(input.value.trim());
        });
        var sendBtn = document.createElement("button");
        sendBtn.style.cssText = "width:38px;height:38px;border-radius:50%;border:none;background:#4f35d2;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;";
        sendBtn.innerHTML = "↑";
        sendBtn.addEventListener("click", function () {
          if (input.value.trim()) sendMessage(input.value.trim());
        });
        inputArea.appendChild(input);
        inputArea.appendChild(sendBtn);
        panel.appendChild(inputArea);

        root.appendChild(panel);

        // Scroll to bottom
        setTimeout(function () {
          msgsArea.scrollTop = msgsArea.scrollHeight;
          input.focus();
        }, 50);
      }

      function sendMessage(text) {
        messages.push({ role: "user", content: text });
        root._loading = true;
        render();

        LF.trackEvent("chat_message", { message_count: messages.length });

        // Build conversation for API (skip greeting if it's the default)
        var apiMessages = messages.map(function (m) { return { role: m.role, content: m.content }; });

        apiPost("/api/websites/chat", {
          messages: apiMessages,
          session_id: getSessionId(),
        }).then(function (data) {
          root._loading = false;
          if (data.reply) {
            messages.push({ role: "assistant", content: data.reply });
          } else if (data.error) {
            messages.push({ role: "assistant", content: "Sorry, I'm having trouble right now. Please try again or call us directly." });
          }
          render();
        }).catch(function () {
          root._loading = false;
          messages.push({ role: "assistant", content: "Connection lost. Please try again." });
          render();
        });
      }

      // Add animations
      var style = document.createElement("style");
      style.textContent = "@keyframes lf-slide-up{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes lf-blink{0%,100%{opacity:0.3}50%{opacity:1}}";
      document.head.appendChild(style);

      render();
    },

    mountBooking: function (elementId) {
      var el = document.getElementById(elementId);
      if (!el) return console.warn("[ListingFlow] Element #" + elementId + " not found");

      el.innerHTML = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:400px;">'
        + '<form id="lf-book-form" style="display:flex;flex-direction:column;gap:8px;">'
        + '<input type="text" placeholder="Your name" required id="lf-book-name" style="padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;">'
        + '<input type="tel" placeholder="Phone number" required id="lf-book-phone" style="padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;">'
        + '<input type="email" placeholder="Email (optional)" id="lf-book-email" style="padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;">'
        + '<input type="date" required id="lf-book-date" style="padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;">'
        + '<select id="lf-book-type" style="padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;">'
        + '<option value="showing">Property Showing</option>'
        + '<option value="consultation">Consultation</option>'
        + '<option value="valuation">Home Valuation</option>'
        + '</select>'
        + '<button type="submit" style="padding:10px 20px;background:#1a1535;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;">Book Appointment</button>'
        + '</form>'
        + '<div id="lf-book-msg" style="display:none;padding:10px;text-align:center;color:#059669;font-size:14px;"></div>'
        + '</div>';

      el.querySelector("#lf-book-form").addEventListener("submit", function (e) {
        e.preventDefault();
        LF.submitBooking({
          name: el.querySelector("#lf-book-name").value,
          phone: el.querySelector("#lf-book-phone").value,
          email: el.querySelector("#lf-book-email").value,
          date: el.querySelector("#lf-book-date").value,
          appointment_type: el.querySelector("#lf-book-type").value,
        }).then(function (r) {
          el.querySelector("#lf-book-form").style.display = "none";
          var msg = el.querySelector("#lf-book-msg");
          msg.style.display = "block";
          msg.textContent = r.message || "Appointment request received!";
        });
      });
    },
  };

  // --- Auto-initialize ---
  window.ListingFlow = LF;

  function autoInit() {
    // Always track page views
    LF.trackPageView();

    // Read data attributes for auto-mounting
    if (!script) return;

    var enabled = function (attr) {
      var v = script.getAttribute("data-" + attr);
      return v === "true" || v === "1" || v === "";
    };

    // Auto-mount chatbot bubble
    if (enabled("chat")) {
      LF.mountChat();
    }

    // Auto-mount newsletter popup (after delay or exit intent)
    if (enabled("newsletter")) {
      var nlDelay = parseInt(script.getAttribute("data-newsletter-delay") || "30") * 1000;
      var nlShown = sessionStorage.getItem("lf_nl_shown");
      if (!nlShown) {
        setTimeout(function () {
          if (sessionStorage.getItem("lf_nl_shown")) return;
          showNewsletterPopup();
        }, nlDelay);

        // Exit intent on desktop
        if (window.innerWidth > 768) {
          document.addEventListener("mouseout", function handler(e) {
            if (e.clientY < 10 && !sessionStorage.getItem("lf_nl_shown")) {
              showNewsletterPopup();
              document.removeEventListener("mouseout", handler);
            }
          });
        }
      }
    }

    // Auto-mount listings into element if specified
    var listingsEl = script.getAttribute("data-listings-el");
    if (enabled("listings") && listingsEl) {
      LF.mountListings(listingsEl, {
        limit: parseInt(script.getAttribute("data-listings-limit") || "6"),
        columns: parseInt(script.getAttribute("data-listings-cols") || "3"),
      });
    }

    // Auto-mount booking into element if specified
    var bookingEl = script.getAttribute("data-booking-el");
    if (enabled("booking") && bookingEl) {
      LF.mountBooking(bookingEl);
    }
  }

  // Newsletter popup (floating overlay)
  function showNewsletterPopup() {
    sessionStorage.setItem("lf_nl_shown", "1");
    LF.trackEvent("newsletter_popup_shown");

    var overlay = document.createElement("div");
    overlay.id = "lf-nl-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99998;display:flex;align-items:center;justify-content:center;animation:lf-fade-in 0.3s ease;";

    var popup = document.createElement("div");
    popup.style.cssText = "background:#fff;border-radius:16px;padding:32px;max-width:420px;width:90%;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;";

    popup.innerHTML = '<button id="lf-nl-close" style="position:absolute;top:12px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#999;line-height:1;">&times;</button>'
      + '<h3 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1a1535;">Stay in the Loop</h3>'
      + '<p style="margin:0 0 16px;font-size:14px;color:#666;line-height:1.5;">Get exclusive listings, market insights, and neighbourhood guides delivered to your inbox.</p>'
      + '<form id="lf-nl-popup-form" style="display:flex;flex-direction:column;gap:10px;">'
      + '<input type="email" placeholder="Your email address" required id="lf-nl-popup-email" style="padding:12px 16px;border:1px solid #ddd;border-radius:10px;font-size:15px;outline:none;">'
      + '<label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#888;line-height:1.4;">'
      + '<input type="checkbox" required id="lf-nl-popup-consent" style="margin-top:2px;"> I agree to receive emails. You can unsubscribe anytime.'
      + '</label>'
      + '<button type="submit" style="padding:12px 24px;background:#1a1535;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:500;cursor:pointer;">Subscribe</button>'
      + '</form>'
      + '<div id="lf-nl-popup-msg" style="display:none;text-align:center;padding:20px 0;"><div style="font-size:28px;margin-bottom:8px;">&#10003;</div><div style="font-size:16px;font-weight:500;color:#059669;">You\'re subscribed!</div></div>';

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Add fade-in animation
    var style = document.createElement("style");
    style.textContent = "@keyframes lf-fade-in{from{opacity:0}to{opacity:1}}";
    document.head.appendChild(style);

    // Close
    overlay.querySelector("#lf-nl-close").addEventListener("click", function () {
      overlay.remove();
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });

    // Submit
    overlay.querySelector("#lf-nl-popup-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = overlay.querySelector("#lf-nl-popup-email").value;
      var consent = overlay.querySelector("#lf-nl-popup-consent").checked;
      LF.submitNewsletter({ email: email, consent: consent }).then(function () {
        overlay.querySelector("#lf-nl-popup-form").style.display = "none";
        overlay.querySelector("#lf-nl-popup-msg").style.display = "block";
        setTimeout(function () { overlay.remove(); }, 2000);
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  // --- Session tracking ---
  var sessionPages = [];
  var sessionStart = Date.now();

  function trackSessionPage() {
    var path = window.location.pathname;
    if (sessionPages[sessionPages.length - 1] !== path) {
      sessionPages.push(path);
    }
  }
  trackSessionPage();

  function sendSessionSummary() {
    var duration = Math.round((Date.now() - sessionStart) / 1000);
    if (duration < 2 || sessionPages.length === 0) return;

    fetch(BASE_URL + "/api/websites/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-LF-Key": API_KEY },
      body: JSON.stringify({
        session_id: getSessionId(),
        pages_visited: sessionPages,
        duration_seconds: duration,
        is_converted: !!sessionStorage.getItem("lf_converted"),
        device_type: getDeviceType(),
        referrer: document.referrer || "",
      }),
      keepalive: true,
    }).catch(function () {});
  }

  // Mark conversion when a form is submitted
  var origSubmitLead = LF.submitLead;
  LF.submitLead = function (data) {
    sessionStorage.setItem("lf_converted", "1");
    return origSubmitLead(data);
  };
  var origSubmitNL = LF.submitNewsletter;
  LF.submitNewsletter = function (data) {
    sessionStorage.setItem("lf_converted", "1");
    return origSubmitNL(data);
  };
  var origSubmitBooking = LF.submitBooking;
  LF.submitBooking = function (data) {
    sessionStorage.setItem("lf_converted", "1");
    return origSubmitBooking(data);
  };

  // Flush events + session on page unload
  window.addEventListener("beforeunload", function () {
    flushEvents();
    sendSessionSummary();
  });
  window.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      flushEvents();
      sendSessionSummary();
    }
  });

  // Track page changes for session
  var _origPush = history.pushState;
  history.pushState = function () {
    _origPush.apply(history, arguments);
    setTimeout(function () { LF.trackPageView(); trackSessionPage(); }, 50);
  };
  window.addEventListener("popstate", function () {
    setTimeout(function () { LF.trackPageView(); trackSessionPage(); }, 50);
  });
})();
