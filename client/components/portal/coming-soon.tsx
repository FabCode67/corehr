import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ComingSoonProps {
  title: string
  description: string
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This module is scaffolded in the navigation and ready to be built out next.
      </CardContent>
    </Card>
  )
}
