import json, shutil, warnings
from pathlib import Path
import numpy as np, pandas as pd, joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, roc_auc_score, accuracy_score, precision_recall_fscore_support
from xgboost import XGBRegressor, XGBClassifier
warnings.filterwarnings('ignore')

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'data'/'training'
MODELS=ROOT/'models'
REPORTS=ROOT/'ml'/'reports'
TRAINING=ROOT/'ml'/'training'
for p in [DATA, MODELS, REPORTS, TRAINING]: p.mkdir(parents=True, exist_ok=True)
SRC=ROOT/'data'/'training'/'AeroNex_Training_Dataset.csv'
df=pd.read_csv(SRC)
expected=['flight_date','airline','flight_number','origin','destination','distance','scheduled_departure','scheduled_arrival','actual_departure','actual_arrival','departure_delay','arrival_delay','cancelled','diverted','airport_delay_rate','airline_delay_rate','route_delay_rate','airport_cancellation_rate','previous_flight_delay','scheduled_connection_minutes','minimum_connection_minutes','boarding_cutoff_minutes','gate_distance_meters','terminal_change','baggage_required','same_airline','same_ticket','connection_feasible_proxy']
assert df.columns.tolist()==expected
for c in ['flight_date','scheduled_departure','scheduled_arrival','actual_departure','actual_arrival']:
    df[c]=pd.to_datetime(df[c], errors='coerce')

def add_features(x):
    x=x.copy()
    x['dep_hour']=x['scheduled_departure'].dt.hour
    x['arr_hour']=x['scheduled_arrival'].dt.hour
    x['dow']=x['flight_date'].dt.dayofweek
    x['month']=x['flight_date'].dt.month
    x['is_weekend']=x['dow'].isin([5,6]).astype(int)
    x['route']=x['origin'].astype(str)+'_'+x['destination'].astype(str)
    return x

df=add_features(df).sort_values('flight_date').reset_index(drop=True)
# Training labels require observed non-cancelled delay values.
delay_df=df[df['cancelled'].fillna(0)==0].copy()
cut_delay=delay_df['flight_date'].quantile(.80)
train_d=delay_df[delay_df.flight_date<=cut_delay]
test_d=delay_df[delay_df.flight_date>cut_delay]

base_num=['distance','airport_delay_rate','airline_delay_rate','route_delay_rate','airport_cancellation_rate','previous_flight_delay','dep_hour','arr_hour','dow','month','is_weekend']
cat=['airline','origin','destination','route']
pre=ColumnTransformer([('num',Pipeline([('impute',SimpleImputer(strategy='median'))]),base_num),('cat',Pipeline([('impute',SimpleImputer(strategy='most_frequent')),('oh',OneHotEncoder(handle_unknown='ignore'))]),cat)])
delay_model=Pipeline([('pre',pre),('model',XGBRegressor(n_estimators=250,max_depth=3,learning_rate=.035,subsample=.85,colsample_bytree=.85,objective='reg:squarederror',random_state=42,n_jobs=2))])
delay_model.fit(train_d[base_num+cat],train_d['arrival_delay'])
pred=delay_model.predict(test_d[base_num+cat])
delay_metrics={'train_rows':len(train_d),'test_rows':len(test_d),'mae_minutes':float(mean_absolute_error(test_d.arrival_delay,pred)),'rmse_minutes':float(np.sqrt(mean_squared_error(test_d.arrival_delay,pred))),'r2':float(r2_score(test_d.arrival_delay,pred))}
joblib.dump(delay_model,MODELS/'aeronex_delay_xgb.joblib')

# Cancellation: highly imbalanced; use chronological split and class weighting. Metrics are explicitly marked low-confidence.
cancel=df.copy(); cut_c=cancel.flight_date.quantile(.80); train_c=cancel[cancel.flight_date<=cut_c]; test_c=cancel[cancel.flight_date>cut_c]
Xcols=base_num+cat+['previous_flight_delay'] if False else base_num+cat
neg=(train_c.cancelled==0).sum(); pos=(train_c.cancelled==1).sum(); spw=max(1,neg/max(pos,1))
cancel_model=Pipeline([('pre',pre),('model',XGBClassifier(n_estimators=180,max_depth=2,learning_rate=.04,subsample=.9,colsample_bytree=.9,eval_metric='logloss',scale_pos_weight=spw,random_state=42,n_jobs=2))])
cancel_model.fit(train_c[Xcols],train_c.cancelled.astype(int))
cp=cancel_model.predict_proba(test_c[Xcols])[:,1]; cy=(cp>=.5).astype(int)
try: auc=float(roc_auc_score(test_c.cancelled,cp))
except: auc=None
pr,rc,f1,_=precision_recall_fscore_support(test_c.cancelled,cy,average='binary',zero_division=0)
cancel_metrics={'train_rows':len(train_c),'test_rows':len(test_c),'train_cancelled':int(pos),'test_cancelled':int(test_c.cancelled.sum()),'roc_auc':auc,'accuracy':float(accuracy_score(test_c.cancelled,cy)),'precision':float(pr),'recall':float(rc),'f1':float(f1),'warning':'Only 5 cancellation examples exist in the supplied dataset; metrics are low-confidence and should not be presented as production accuracy.'}
joblib.dump(cancel_model,MODELS/'aeronex_cancellation_xgb.joblib')

# Connection feasibility proxy: operational feasibility label, not passenger outcome.
conn=df.copy(); cut_k=conn.flight_date.quantile(.80); train_k=conn[conn.flight_date<=cut_k]; test_k=conn[conn.flight_date>cut_k]
conn_num=['distance','airport_delay_rate','airline_delay_rate','route_delay_rate','airport_cancellation_rate','previous_flight_delay','scheduled_connection_minutes','minimum_connection_minutes','boarding_cutoff_minutes','gate_distance_meters','terminal_change','baggage_required','same_airline','same_ticket','dep_hour','arr_hour','dow','month','is_weekend']
conn_cat=['airline','origin','destination','route']
conn_pre=ColumnTransformer([('num',Pipeline([('impute',SimpleImputer(strategy='median'))]),conn_num),('cat',Pipeline([('impute',SimpleImputer(strategy='most_frequent')),('oh',OneHotEncoder(handle_unknown='ignore'))]),conn_cat)])
conn_model=Pipeline([('pre',conn_pre),('model',XGBClassifier(n_estimators=220,max_depth=3,learning_rate=.035,subsample=.9,colsample_bytree=.9,eval_metric='logloss',random_state=42,n_jobs=2))])
conn_model.fit(train_k[conn_num+conn_cat],train_k.connection_feasible_proxy.astype(int))
kp=conn_model.predict_proba(test_k[conn_num+conn_cat])[:,1]; ky=(kp>=.5).astype(int)
try: kauc=float(roc_auc_score(test_k.connection_feasible_proxy,kp))
except: kauc=None
kpr,krc,kf1,_=precision_recall_fscore_support(test_k.connection_feasible_proxy,ky,average='binary',zero_division=0)
conn_metrics={'train_rows':len(train_k),'test_rows':len(test_k),'roc_auc':kauc,'accuracy':float(accuracy_score(test_k.connection_feasible_proxy,ky)),'precision':float(kpr),'recall':float(krc),'f1':float(kf1),'target':'connection_feasible_proxy','warning':'This target is an operational proxy derived from connection constraints, not real passenger caught/missed outcomes.'}
joblib.dump(conn_model,MODELS/'aeronex_connection_xgb_proxy.joblib')

# Save exact training data used and metadata

if SRC.resolve() != (DATA/'AeroNex_Training_Dataset.csv').resolve(): shutil.copy2(SRC,DATA/'AeroNex_Training_Dataset.csv')
meta={'dataset':'AeroNex_Training_Dataset.csv','rows':int(len(df)),'columns':expected,'split':'chronological 80/20 by flight_date','models':{'delay':{'file':'aeronex_delay_xgb.joblib','type':'XGBRegressor','target':'arrival_delay','features':base_num+cat},'cancellation':{'file':'aeronex_cancellation_xgb.joblib','type':'XGBClassifier','target':'cancelled','features':Xcols},'connection':{'file':'aeronex_connection_xgb_proxy.joblib','type':'XGBClassifier','target':'connection_feasible_proxy','features':conn_num+conn_cat}},'limitations':['190 rows only','5 cancellation positives only','connection target is proxy, not passenger outcome','not aviation safety certified']}
(REPORTS/'training_metrics.json').write_text(json.dumps({'dataset_summary':{'rows':190,'cancelled':int(df.cancelled.sum()),'connection_proxy_positive':int(df.connection_feasible_proxy.sum())},'delay':delay_metrics,'cancellation':cancel_metrics,'connection':conn_metrics},indent=2),encoding='utf-8')
(MODELS/'model_registry.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
print(json.dumps({'delay':delay_metrics,'cancellation':cancel_metrics,'connection':conn_metrics},indent=2))
