import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Heading,
    Text,
    Button,
    Hr,
} from "@react-email/components";

export default function InterviewInvite({
    candidateName,
    interviewLink,
    role,
}) {
    return (
        <Html>
            <Head />

            <Body
                style={{
                    backgroundColor: "#f3f4f6",
                    fontFamily:
                        "Inter, Arial, sans-serif",
                    padding: "32px 16px",
                }}
            >
                <Container
                    style={{
                        maxWidth: "560px",
                        margin: "0 auto",
                        backgroundColor: "#ffffff",
                        borderRadius: "20px",
                        overflow: "hidden",
                        border:
                            "1px solid #e5e7eb",
                        boxShadow:
                            "0 4px 20px rgba(0,0,0,0.06)",
                    }}
                >
                    {/* Header */}
                    <Section
                        style={{
                            background:
                                "linear-gradient(135deg, #4f46e5, #3b82f6)",
                            padding: "32px",
                            textAlign: "center",
                        }}
                    >
                        <Heading
                            style={{
                                color: "#ffffff",
                                margin: 0,
                                fontSize: "28px",
                                fontWeight: "700",
                            }}
                        >
                            Nexus
                        </Heading>

                        <Text
                            style={{
                                color:
                                    "rgba(255,255,255,0.9)",
                                marginTop: "8px",
                                fontSize: "14px",
                            }}
                        >
                            AI-Assisted Interview Platform
                        </Text>
                    </Section>

                    {/* Content */}
                    <Section
                        style={{
                            padding: "36px 32px",
                        }}
                    >
                        <Heading
                            as="h2"
                            style={{
                                fontSize: "24px",
                                color: "#111827",
                                marginBottom: "20px",
                            }}
                        >
                            Interview Invitation
                        </Heading>

                        <Text
                            style={{
                                color: "#374151",
                                fontSize: "16px",
                                lineHeight: "26px",
                            }}
                        >
                            Hi{" "}
                            <strong>
                                {candidateName}
                            </strong>
                            ,
                        </Text>

                        <Text
                            style={{
                                color: "#374151",
                                fontSize: "16px",
                                lineHeight: "26px",
                            }}
                        >
                            You have been invited
                            for a{" "}
                            <strong>
                                {role}
                            </strong>{" "}
                            interview through{" "}
                            <strong>Nexus</strong>.
                        </Text>

                        <Text
                            style={{
                                color: "#374151",
                                fontSize: "16px",
                                lineHeight: "26px",
                            }}
                        >
                            If you already have
                            an account with the
                            same email address,
                            simply log in and your
                            interview details will
                            automatically appear
                            on your dashboard.
                        </Text>

                        <Text
                            style={{
                                color: "#374151",
                                fontSize: "16px",
                                lineHeight: "26px",
                            }}
                        >
                            If you do not have an
                            account yet, please
                            create a candidate
                            account using the same{" "}
                            <strong>
                                name and email
                                address
                            </strong>{" "}
                            to access your
                            scheduled interview.
                        </Text>

                        {/* CTA */}
                        <Section
                            style={{
                                textAlign: "center",
                                margin:
                                    "36px 0 28px",
                            }}
                        >
                            <Button
                                href={
                                    interviewLink
                                }
                                style={{
                                    backgroundColor:
                                        "#4f46e5",
                                    color: "#ffffff",
                                    padding:
                                        "14px 28px",
                                    borderRadius:
                                        "12px",
                                    fontWeight:
                                        "600",
                                    fontSize: "15px",
                                    textDecoration:
                                        "none",
                                    display:
                                        "inline-block",
                                }}
                            >
                                View Interview Details
                            </Button>
                        </Section>

                        <Text
                            style={{
                                color: "#6b7280",
                                fontSize: "14px",
                                lineHeight: "22px",
                            }}
                        >
                            Your interview details
                            will also be available
                            in your Nexus
                            dashboard after
                            logging in.
                        </Text>

                        <Hr
                            style={{
                                borderColor:
                                    "#e5e7eb",
                                margin:
                                    "28px 0",
                            }}
                        />



                        <Text
                            style={{
                                color: "#9ca3af",
                                fontSize: "13px",
                                textAlign: "center",
                                lineHeight: "20px",
                            }}
                        >
                            This invitation was
                            sent via Nexus
                            Interview Platform.
                            <br />
                            If you did not expect
                            this email, you may
                            safely ignore it.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}
