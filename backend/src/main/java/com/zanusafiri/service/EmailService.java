package com.zanusafiri.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.host}")
    private String mailHost;

    @Value("${spring.mail.port}")
    private int mailPort;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${spring.mail.password}")
    private String mailPassword;

    @PostConstruct
    void logMailConfiguration() {
        if (!isMailConfigured()) {
            log.error("Email is NOT configured. Set MAIL_USERNAME and MAIL_PASSWORD environment variables. Current host={}, port={}, usernameConfigured={}, passwordConfigured={}",
                mailHost, mailPort, hasText(fromEmail), hasText(mailPassword));
            return;
        }

        log.info("Email configured: host={}, port={}, username={}", mailHost, mailPort, maskEmail(fromEmail));
    }

    public void sendWelcomeEmail(String toEmail, String fullName, String username, String tempPassword, LocalDateTime expiresAt) {
        try {
            String html = buildWelcomeEmailHtml(fullName, username, toEmail, tempPassword, expiresAt);
            sendHtmlEmail(toEmail, "ZanUsafiri - Your Temporary Login Password", html);
            log.info("Welcome email sent to: {}", toEmail);

        } catch (MessagingException e) {
            log.error("Failed to build welcome email for {}: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to build welcome email: " + e.getMessage(), e);
        } catch (MailException | IllegalStateException e) {
            log.error("Failed to send welcome email to {}. Check SMTP credentials, app password, TLS settings, and spam folder. Error: {}",
                toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send welcome email: " + e.getMessage(), e);
        }
    }

    public void sendTestEmail(String toEmail) {
        try {
            String html = """
                <div style="font-family:Arial,sans-serif;line-height:1.5">
                  <h2>ZanUsafiri Email Test</h2>
                  <p>If you received this email, SMTP delivery is working.</p>
                  <p>You can now create users and they should receive their temporary passwords.</p>
                </div>
                """;
            sendHtmlEmail(toEmail, "ZanUsafiri - Test Email", html);
            log.info("Test email sent to: {}", toEmail);
        } catch (MessagingException e) {
            log.error("Failed to build test email for {}: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to build test email: " + e.getMessage(), e);
        } catch (MailException | IllegalStateException e) {
            log.error("Failed to send test email to {}. Error: {}", toEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send test email: " + e.getMessage(), e);
        }
    }

    private void sendHtmlEmail(String toEmail, String subject, String html) throws MessagingException {
        if (!isMailConfigured()) {
            throw new IllegalStateException("Email is not configured. Set MAIL_USERNAME and MAIL_PASSWORD environment variables.");
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(html, true);

        mailSender.send(message);
    }

    private String buildWelcomeEmailHtml(String fullName, String username, String email, String tempPassword, LocalDateTime expiresAt) {
        String formattedExpiry = expiresAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"));

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8"/>
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
                .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
                .header { background: linear-gradient(135deg, #1d3a44, #367588); padding: 32px 36px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 22px; letter-spacing: -0.5px; }
                .header p { color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; }
                .body { padding: 32px 36px; }
                .body p { color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
                .cred-box { background: #eff9fd; border: 1.5px solid #ADDFF1; border-radius: 10px; padding: 18px 22px; margin: 20px 0; }
                .cred-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
                .cred-row:last-child { margin-bottom: 0; }
                .cred-label { color: #6b7280; font-weight: 500; }
                .cred-value { color: #111827; font-weight: 700; font-family: monospace; font-size: 15px; }
                .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; margin: 20px 0; }
                .footer { background: #f9fafb; padding: 20px 36px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🚌 ZanUsafiri</h1>
                  <p>Mfumo wa Usimamizi wa Usafiri — Zanzibar</p>
                </div>
                <div class="body">
                  <p>Habari <strong>%s</strong>,</p>
                  <p>Your ZanUsafiri account has been created by an administrator. Log in using the temporary password below, then change it before accessing the dashboard.</p>

                  <div class="cred-box">
                    <div class="cred-row">
                      <span class="cred-label">System</span>
                      <span class="cred-value">ZanUsafiri</span>
                    </div>
                    <div class="cred-row">
                      <span class="cred-label">Jina la Mtumiaji (Username)</span>
                      <span class="cred-value">%s</span>
                    </div>
                    <div class="cred-row">
                      <span class="cred-label">Email</span>
                      <span class="cred-value">%s</span>
                    </div>
                    <div class="cred-row">
                      <span class="cred-label">Nywila ya Muda (Temporary Password)</span>
                      <span class="cred-value">%s</span>
                    </div>
                    <div class="cred-row">
                      <span class="cred-label">Expires</span>
                      <span class="cred-value">%s</span>
                    </div>
                  </div>

                  <div class="warning">
                    <strong>Important:</strong> You are using a temporary password. Please change your password immediately after login. This password expires after 24 hours.
                  </div>

                  <p>After changing your password, you will be able to continue using the ZanUsafiri system.</p>
                  <p style="color:#6b7280; font-size:13px;">Kama hukukuomba akaunti hii, tafadhali wasiliana na msimamizi wako mara moja.</p>
                </div>
                <div class="footer">
                  &copy; 2026 ZanUsafiri · Zanzibar, Tanzania<br/>
                  Barua hii imetumwa kiotomatiki — tafadhali usijibu.
                </div>
              </div>
            </body>
            </html>
            """.formatted(fullName, username, email, tempPassword, formattedExpiry);
    }

    private boolean isMailConfigured() {
        return hasText(fromEmail) && hasText(mailPassword);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String maskEmail(String email) {
        if (!hasText(email)) return "";
        int at = email.indexOf('@');
        if (at <= 1) return "***" + email.substring(Math.max(at, 0));
        return email.charAt(0) + "***" + email.substring(at);
    }
}
