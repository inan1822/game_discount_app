"use client"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface Props {
  data: { date: string; revenue: number }[]
}

export function RevenueChart({ data }: Props) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid stroke="rgba(188,188,201,0.10)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#9fa0a1" fontSize={11} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis stroke="#9fa0a1" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "#1c1e2a",
              border: "1px solid rgba(188,188,201,0.20)",
              borderRadius: 10,
            }}
            labelStyle={{ color: "#b3bade" }}
            itemStyle={{ color: "#6475D1" }}
            formatter={(v) => [`$${Number(v).toFixed(2)}`, "Revenue"]}
          />
          <Line type="monotone" dataKey="revenue" stroke="#6475D1" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
