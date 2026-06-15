import React from 'react';
import {
    Html,
    Body,
    Container,
    Heading,
    Text,
    Link,
} from "@react-email/components";

export default function OnboardingEmail({
    name,
    email,
    temporaryPassword,
    organization,
    role,
    loginLink,
}) {
    return (
        <Html>
            <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
                <Container
                    style={{
                        background: "white",
                        padding: "32px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        marginTop: "32px",
                    }}
                >
                    <Heading style={{ color: "#4f46e5", fontSize: "22px", marginBottom: "16px" }}>
                        Welcome to Nexus Platform
                    </Heading>

                    <Text style={{ fontSize: "16px", color: "#334155" }}>
                        Hi {name},
                    </Text>

                    <Text style={{ fontSize: "15px", color: "#334155", lineHeight: "1.5" }}>
                        You have been registered for a new account with the <strong>{organization}</strong> team as an <strong>{role.toUpperCase()}</strong>.
                    </Text>

                    <Text style={{ fontSize: "15px", color: "#334155", margin: "16px 0" }}>
                        Here are your temporary login credentials:
                    </Text>

                    <Container style={{ background: "#f1f5f9", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
                        <Text style={{ margin: "4px 0", fontSize: "14px", color: "#475569" }}>
                            <strong>Login Email:</strong> {email}
                        </Text>
                        <Text style={{ margin: "4px 0", fontSize: "14px", color: "#475569" }}>
                            <strong>Temporary Password:</strong> <code style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "13px" }}>{temporaryPassword}</code>
                        </Text>
                    </Container>

                    <Text style={{ fontSize: "14px", color: "#64748b", marginBottom: "24px" }}>
                        Please log in using the link below and change your password as soon as possible.
                    </Text>

                    <Link
                        href={loginLink}
                        style={{
                            background: "#4f46e5",
                            color: "#fff",
                            padding: "12px 20px",
                            borderRadius: "8px",
                            textDecoration: "none",
                            display: "inline-block",
                            fontWeight: "bold",
                            textAlign: "center",
                        }}
                    >
                        Log In to Nexus
                    </Link>
                </Container>
            </Body>
        </Html>
    );
}
