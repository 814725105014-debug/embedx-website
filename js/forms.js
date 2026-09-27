/**
 * EMBEDX Forms Handling & Validation
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================
  // 1. JOIN EMBEDX APPLICATION FORM
  // =========================================================

  const joinForm = document.getElementById('joinEmbedxForm');

  if (joinForm) {

    // -------------------------------------------------------
    // Restore draft only if the form was not already submitted
    // -------------------------------------------------------

    if (
      sessionStorage.getItem('embedx_join_submitted') !== '1'
    ) {

      loadFormDraft(
        joinForm,
        'embedx_join_draft'
      );

    } else {

      localStorage.removeItem(
        'embedx_join_draft'
      );

      joinForm.reset();
    }


    // -------------------------------------------------------
    // Auto-save on input
    // -------------------------------------------------------

    joinForm.addEventListener(
      'input',
      () => {

        sessionStorage.removeItem(
          'embedx_join_submitted'
        );

        saveFormDraft(
          joinForm,
          'embedx_join_draft'
        );

      }
    );


    // -------------------------------------------------------
    // Submit Join Form
    // -------------------------------------------------------

    joinForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        if (!validateJoinForm(joinForm)) {
          return;
        }


        const submitButton =
          joinForm.querySelector(
            'button[type="submit"]'
          );

        const originalButtonHTML =
          submitButton.innerHTML;


        submitButton.disabled = true;

        submitButton.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> SUBMITTING...';


        try {

          // -------------------------------------------------
          // Collect Form Data
          // -------------------------------------------------

          const formData =
            new FormData(joinForm);

          const data = {};


          formData.forEach(
            (value, key) => {

              if (key === 'interests') {

                if (!data.interests) {
                  data.interests = [];
                }

                data.interests.push(value);

              } else {

                data[key] = value;

              }

            }
          );


          // -------------------------------------------------
          // Request Timeout
          // -------------------------------------------------

          const controller =
            new AbortController();

          const timeout =
            setTimeout(
              () => controller.abort(),
              15000
            );


          // -------------------------------------------------
          // Send to Cloudflare Worker
          // -------------------------------------------------

          const response =
            await fetch(
              '/api/join',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  'Accept':
                    'application/json'
                },

                body:
                  JSON.stringify(data),

                signal:
                  controller.signal
              }
            );


          clearTimeout(timeout);


          // -------------------------------------------------
          // Read Response
          // -------------------------------------------------

          const responseText =
            await response.text();


          let result;

          try {

            result =
              JSON.parse(responseText);

          } catch {

            throw new Error(
              'Invalid response from server.'
            );

          }


          // -------------------------------------------------
          // Validate Response
          // -------------------------------------------------

          if (
            !response.ok ||
            result.success !== true
          ) {

            throw new Error(
              result.message ||
              'Form submission failed.'
            );

          }


          // =================================================
          // SUCCESS MESSAGE
          // =================================================

          showSubmissionSuccess(
            'Application Submitted Successfully!',
            `
            <p>
              Thank you for applying to
              <strong>
                EMBEDX – Embedded Systems & Automation Club
              </strong>,
              Department of EEE.
            </p>

            <p>
              Your application has been successfully submitted.
              Our Technical Coordination Committee will review
              your submission and contact you regarding the
              upcoming
              <strong>
                orientation and domain selection rounds
              </strong>.
            </p>

            <p>
              📧
              <strong>
                Please check your email inbox and Spam/Junk
                folder
              </strong>
              for further details and communication from EMBEDX.
            </p>

            <p>
              📱 You may also join the official
              <strong>
                EMBEDX WhatsApp group
              </strong>
              to receive important announcements and updates.
            </p>

            <p style="margin-top: 18px; text-align: center;">

              <a
                href="https://chat.whatsapp.com/C0lGhoQ6D9MK79OXroCPuF"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display: inline-block;
                  padding: 11px 18px;
                  background: #25D366;
                  color: #ffffff;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                "
              >
                Join EMBEDX WhatsApp Group
              </a>

            </p>
            `
          );


          // -------------------------------------------------
          // Clear Draft After Successful Submission
          // -------------------------------------------------

          localStorage.removeItem(
            'embedx_join_draft'
          );

          sessionStorage.setItem(
            'embedx_join_submitted',
            '1'
          );

          joinForm.reset();


        } catch (error) {

          console.error(
            'Join form submission error:',
            error
          );


          showSubmissionSuccess(
            'Submission Failed',
            `
            <p>
              We could not submit your application
              at this time.
            </p>

            <p>
              Please check your internet connection
              and try again.
            </p>
            `
          );


        } finally {

          submitButton.disabled = false;

          submitButton.innerHTML =
            originalButtonHTML;

        }

      }
    );

  }


  // =========================================================
  // 2. CONTACT / INQUIRY FORM
  // =========================================================

  const contactForm =
    document.getElementById(
      'contactForm'
    );


  if (contactForm) {

    contactForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        if (!validateContactForm(contactForm)) {
          return;
        }


        const submitButton =
          contactForm.querySelector(
            'button[type="submit"]'
          );


        const originalButtonHTML =
          submitButton
            ? submitButton.innerHTML
            : '';


        if (submitButton) {

          submitButton.disabled = true;

          submitButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> SENDING...';

        }


        try {

          // -------------------------------------------------
          // Collect Inquiry Data
          // -------------------------------------------------

          const data = {

            name:
              document
                .getElementById(
                  'contactName'
                )
                .value
                .trim(),

            email:
              document
                .getElementById(
                  'contactEmail'
                )
                .value
                .trim(),

            subject:
              document
                .getElementById(
                  'contactSubject'
                )
                .value
                .trim(),

            message:
              document
                .getElementById(
                  'contactMessage'
                )
                .value
                .trim()

          };


          // -------------------------------------------------
          // Request Timeout
          // -------------------------------------------------

          const controller =
            new AbortController();

          const timeout =
            setTimeout(
              () => controller.abort(),
              15000
            );


          // -------------------------------------------------
          // Send to Cloudflare Worker
          // -------------------------------------------------

          const response =
            await fetch(
              '/api/inquiry',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json',

                  'Accept':
                    'application/json'
                },

                body:
                  JSON.stringify(data),

                signal:
                  controller.signal
              }
            );


          clearTimeout(timeout);


          // -------------------------------------------------
          // Read Response
          // -------------------------------------------------

          const responseText =
            await response.text();


          let result;

          try {

            result =
              JSON.parse(responseText);

          } catch {

            throw new Error(
              'Invalid response from server.'
            );

          }


          // -------------------------------------------------
          // Validate Response
          // -------------------------------------------------

          if (
            !response.ok ||
            result.success !== true
          ) {

            throw new Error(
              result.message ||
              'Message submission failed.'
            );

          }


          // =================================================
          // INQUIRY SUCCESS
          // =================================================

          showSubmissionSuccess(
            'Enquiry Submitted Successfully!',
            `
            <p>
              Thank you for contacting
              <strong>
                EMBEDX – Embedded Systems & Automation Club
              </strong>,
              Department of EEE.
            </p>

            <p>
              Your enquiry has been successfully received.
              Our team will review your message and get back
              to you as soon as possible.
            </p>

            <p>
              📧
              <strong>
                Please check your email inbox and Spam/Junk
                folder
              </strong>
              for our response and further communication
              from EMBEDX.
            </p>
            `
          );


          contactForm.reset();


        } catch (error) {

          console.error(
            'Contact form submission error:',
            error
          );


          showSubmissionSuccess(
            'Submission Failed',
            `
            <p>
              We could not send your message
              at this time.
            </p>

            <p>
              Please check your internet connection
              and try again.
            </p>
            `
          );


        } finally {

          if (submitButton) {

            submitButton.disabled = false;

            submitButton.innerHTML =
              originalButtonHTML;

          }

        }

      }
    );

  }

});


// =========================================================
// 3. JOIN FORM VALIDATION
// =========================================================

function validateJoinForm(form) {

  let isValid = true;


  clearValidationErrors(form);


  const fullName =
    form.querySelector(
      '#fullName'
    );

  const department =
    form.querySelector(
      '#department'
    );

  const year =
    form.querySelector(
      '#year'
    );

  const email =
    form.querySelector(
      '#email'
    );

  const phone =
    form.querySelector(
      '#phone'
    );

  const interests =
    form.querySelectorAll(
      'input[name="interests"]:checked'
    );

  const motivation =
    form.querySelector(
      '#motivation'
    );

  const consent =
    form.querySelector(
      '#consent'
    );


  // -------------------------------------------------------
  // Full Name
  // -------------------------------------------------------

  if (!fullName.value.trim()) {

    setError(
      fullName,
      'Please provide your full legal name.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Department
  // -------------------------------------------------------

  if (!department.value) {

    setError(
      department,
      'Please select your academic department.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Year
  // -------------------------------------------------------

  if (!year.value) {

    setError(
      year,
      'Please select your current year of study.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Email
  // -------------------------------------------------------

  if (
    !validateEmail(
      email.value.trim()
    )
  ) {

    setError(
      email,
      'Please enter a valid academic/personal email address.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Phone
  // -------------------------------------------------------

  if (
    !validatePhone(
      phone.value.trim()
    )
  ) {

    setError(
      phone,
      'Please enter a valid 10-digit mobile contact number.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Interests
  // -------------------------------------------------------

  if (interests.length === 0) {

    const group =
      form.querySelector(
        '.interest-tag-group'
      );


    setError(
      group,
      'Please choose at least one technical domain of interest.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Motivation
  // -------------------------------------------------------

  if (
    !motivation.value.trim() ||
    motivation.value.trim().length < 20
  ) {

    setError(
      motivation,
      'Please write a brief statement (at least 20 characters) explaining why you wish to join.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Consent
  // -------------------------------------------------------

  if (!consent.checked) {

    setError(
      consent,
      'You must agree to participate actively in club technical activities.'
    );

    isValid = false;

  }


  return isValid;
}


// =========================================================
// 4. CONTACT FORM VALIDATION
// =========================================================

function validateContactForm(form) {

  let isValid = true;


  clearValidationErrors(form);


  const name =
    form.querySelector(
      '#contactName'
    );

  const email =
    form.querySelector(
      '#contactEmail'
    );

  const message =
    form.querySelector(
      '#contactMessage'
    );


  // -------------------------------------------------------
  // Name
  // -------------------------------------------------------

  if (!name.value.trim()) {

    setError(
      name,
      'Please enter your name.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Email
  // -------------------------------------------------------

  if (
    !validateEmail(
      email.value.trim()
    )
  ) {

    setError(
      email,
      'Please enter a valid email address.'
    );

    isValid = false;

  }


  // -------------------------------------------------------
  // Message
  // -------------------------------------------------------

  if (
    !message.value.trim() ||
    message.value.trim().length < 10
  ) {

    setError(
      message,
      'Please provide a message of at least 10 characters.'
    );

    isValid = false;

  }


  return isValid;
}


// =========================================================
// 5. SET VALIDATION ERROR
// =========================================================

function setError(
  element,
  message
) {

  element.classList.add(
    'is-invalid'
  );


  const parent =
    element.closest(
      '.form-group'
    ) ||
    element.parentElement;


  let feedback =
    parent.querySelector(
      '.invalid-feedback'
    );


  if (!feedback) {

    feedback =
      document.createElement(
        'div'
      );

    feedback.className =
      'invalid-feedback';

    parent.appendChild(
      feedback
    );

  }


  feedback.textContent =
    message;
}


// =========================================================
// 6. CLEAR VALIDATION ERRORS
// =========================================================

function clearValidationErrors(form) {

  form
    .querySelectorAll(
      '.is-invalid'
    )
    .forEach(
      el => {
        el.classList.remove(
          'is-invalid'
        );
      }
    );


  form
    .querySelectorAll(
      '.invalid-feedback'
    )
    .forEach(
      el => {
        el.remove();
      }
    );
}


// =========================================================
// 7. EMAIL VALIDATION
// =========================================================

function validateEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


// =========================================================
// 8. PHONE VALIDATION
// =========================================================

function validatePhone(phone) {

  return /^[0-9+() -]{10,14}$/
    .test(
      phone.trim()
    );

}


// =========================================================
// 9. SAVE FORM DRAFT
// =========================================================

function saveFormDraft(
  form,
  storageKey
) {

  const data = {};


  const inputs =
    form.querySelectorAll(
      'input, select, textarea'
    );


  inputs.forEach(
    input => {

      if (
        input.type === 'checkbox'
      ) {

        if (
          input.name === 'interests'
        ) {

          if (!data.interests) {
            data.interests = [];
          }


          if (input.checked) {

            data.interests.push(
              input.value
            );

          }

        } else {

          data[
            input.id ||
            input.name
          ] =
            input.checked;

        }

      } else {

        data[
          input.id ||
          input.name
        ] =
          input.value;

      }

    }
  );


  localStorage.setItem(
    storageKey,
    JSON.stringify(data)
  );

}


// =========================================================
// 10. LOAD FORM DRAFT
// =========================================================

function loadFormDraft(
  form,
  storageKey
) {

  try {

    const raw =
      localStorage.getItem(
        storageKey
      );


    if (!raw) {
      return;
    }


    const data =
      JSON.parse(raw);


    Object.keys(data).forEach(
      key => {

        const input =
          form.querySelector(
            `#${key}`
          ) ||
          form.querySelector(
            `[name="${key}"]`
          );


        if (input) {

          if (
            input.type ===
            'checkbox'
          ) {

            input.checked =
              data[key];

          } else {

            input.value =
              data[key];

          }

        }

      }
    );


    // -----------------------------------------------------
    // Restore Interests
    // -----------------------------------------------------

    if (
      data.interests &&
      Array.isArray(data.interests)
    ) {

      data.interests.forEach(
        val => {

          const chk =
            form.querySelector(
              `input[name="interests"][value="${val}"]`
            );


          if (chk) {

            chk.checked = true;

          }

        }
      );

    }


  } catch (err) {

    console.error(
      'Could not load draft',
      err
    );

  }

}


// =========================================================
// 11. SUCCESS / FEEDBACK MODAL
// =========================================================

function showSubmissionSuccess(
  title,
  message
) {

  let modal =
    document.getElementById(
      'globalFeedbackModal'
    );


  // =======================================================
  // CREATE MODAL
  // =======================================================

  if (!modal) {

    modal =
      document.createElement(
        'div'
      );


    modal.id =
      'globalFeedbackModal';


    modal.className =
      'modal-backdrop';


    modal.innerHTML = `

      <div
        class="modal-dialog text-center"
        style="
          max-width: 500px;
          width: calc(100% - 30px);
        "
      >

        <!-- CLOSE BUTTON -->

        <button
          class="modal-close-btn"
          onclick="
            this.closest('.modal-backdrop')
              .classList.remove('open')
          "
          aria-label="Close"
        >
          &times;
        </button>


        <!-- GREEN SUCCESS ICON -->

        <div
          style="
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(20, 107, 58, 0.1);
            color: var(--engineering-green);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            margin: 0 auto 1.25rem;
          "
        >

          <i class="fa-solid fa-check"></i>

        </div>


        <!-- TITLE -->

        <h3
          id="feedbackModalTitle"
          class="text-navy"
          style="
            margin-bottom: 0.75rem;
          "
        >
          ${title}
        </h3>


        <!-- MESSAGE -->

        <div
          id="feedbackModalMessage"
          class="text-muted"
          style="
            margin-bottom: 1.5rem;
            line-height: 1.7;
            text-align: left;
            font-size: 0.95rem;
          "
        >
          ${message}
        </div>


        <!-- CLOSE -->

        <button
          class="btn btn-primary"
          onclick="
            this.closest('.modal-backdrop')
              .classList.remove('open')
          "
        >
          Close
        </button>

      </div>

    `;


    document.body.appendChild(
      modal
    );


  } else {

    // =====================================================
    // UPDATE EXISTING MODAL
    // =====================================================

    document.getElementById(
      'feedbackModalTitle'
    ).textContent =
      title;


    document.getElementById(
      'feedbackModalMessage'
    ).innerHTML =
      message;

  }


  // =======================================================
  // OPEN MODAL
  // =======================================================

  setTimeout(
    () => {

      modal.classList.add(
        'open'
      );

    },
    10
  );

}
