"use client"

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

interface RevenueChartProps {
  data: { date: string; amount: number; orderCount: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(24, 24, 27, 0.9)',
      borderColor: 'rgba(168, 85, 247, 0.2)',
      textStyle: {
        color: '#fff'
      },
      valueFormatter: (value: number | string) => {
        if (typeof value !== 'number') return value;
        return Number.isInteger(value) ? `${value}` : `¥${value.toFixed(2)}`;
      }
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: {
        color: '#a1a1aa',
        fontSize: 11
      }
    },
    grid: {
      top: 36,
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.date),
      axisTick: {
        alignWithLabel: true
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisLabel: {
        color: '#71717a',
        fontSize: 10
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '收入',
        nameTextStyle: {
          color: '#71717a',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)',
            type: 'dashed'
          }
        },
        axisLabel: {
          color: '#71717a',
          fontSize: 10,
          formatter: (value: number) => `¥${value}`
        }
      },
      {
        type: 'value',
        name: '订单',
        minInterval: 1,
        nameTextStyle: {
          color: '#71717a',
          fontSize: 10
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          color: '#71717a',
          fontSize: 10,
          formatter: (value: number) => `${value}`
        }
      }
    ],
    series: [
      {
        name: '收入 (¥)',
        type: 'bar',
        yAxisIndex: 0,
        barWidth: '40%',
        data: data.map(item => item.amount),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(168, 85, 247, 0.8)' },
            { offset: 1, color: 'rgba(168, 85, 247, 0.3)' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: 'rgba(168, 85, 247, 1)'
          }
        }
      },
      {
        name: '订单数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        data: data.map(item => item.orderCount),
        lineStyle: {
          color: '#34d399',
          width: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(52, 211, 153, 0.35)'
        },
        itemStyle: {
          color: '#34d399'
        }
      }
    ]
  };

  return (
    <div className="w-full h-[250px]">
      <ReactECharts 
        option={option} 
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
    </div>
  );
}
