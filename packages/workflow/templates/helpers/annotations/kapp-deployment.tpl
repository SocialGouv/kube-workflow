{{- define "annotations.kapp-deployment" -}}
kapp.k14s.io/change-group: "kube-workflow/{{ $.Values.global.namespace }}"
{{- if $.Values.stage }}
kapp.k14s.io/change-group.kube-workflow-stage: "kube-workflow/{{ $.Values.stage }}.{{ $.Values.global.namespace }}"
{{- end }}
kapp.k14s.io/change-group.{{ or .Values.component .Chart.Name }}: "kube-workflow/{{ or $.Values.component .Chart.Name }}.{{ $.Values.global.namespace }}"
{{- range $need := $.Values.needs }}
kapp.k14s.io/change-rule.{{ $need }}: "upsert after upserting kube-workflow/{{ $need }}.{{ $.Values.global.namespace }}"
{{- end }}
{{- end -}}